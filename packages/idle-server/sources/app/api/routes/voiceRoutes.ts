import { z } from "zod";
import { type Fastify } from "../types";
import { log } from "@/utils/log";
import { db } from "@/storage/db";
import { decryptString } from "@/modules/encrypt";
import * as privacyKit from "privacy-kit";

export function voiceRoutes(app: Fastify) {
    app.post('/v1/voice/token', {
        preHandler: app.authenticate,
        schema: {
            body: z.object({
                agentId: z.string(),
                revenueCatPublicKey: z.string().optional()
            }),
            response: {
                200: z.object({
                    allowed: z.boolean(),
                    token: z.string().optional(),
                    agentId: z.string().optional()
                }),
                400: z.object({
                    allowed: z.boolean(),
                    error: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId; // CUID from JWT
        const { agentId, revenueCatPublicKey } = request.body;

        log({ module: 'voice' }, `Voice token request from user ${userId}`);

        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENV === 'dev';
        const requireSubscription = process.env.IDLE_REQUIRE_SUBSCRIPTION === 'true';

        // Subscription check — only when explicitly enabled via env var
        // During alpha, voice is free for all authenticated users
        if (requireSubscription && !isDevelopment) {
            if (!revenueCatPublicKey) {
                log({ module: 'voice' }, 'Subscription required but no RevenueCat public key provided');
                return reply.code(400).send({
                    allowed: false,
                    error: 'Subscription required'
                });
            }

            const response = await fetch(
                `https://api.revenuecat.com/v1/subscribers/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${revenueCatPublicKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                log({ module: 'voice' }, `RevenueCat check failed for user ${userId}: ${response.status}`);
                return reply.send({
                    allowed: false,
                    agentId
                });
            }

            const data = await response.json() as any;
            const proEntitlement = data.subscriber?.entitlements?.active?.pro;

            if (!proEntitlement) {
                log({ module: 'voice' }, `User ${userId} does not have active subscription`);
                return reply.send({
                    allowed: false,
                    agentId
                });
            }
        }

        // Check for user's BYOK ElevenLabs key first, fall back to platform key
        let elevenLabsApiKey: string | undefined;

        // PGlite + Prisma 6 Bytes bug: read token via raw SQL, not Prisma select
        const tokenResults = await db.$queryRawUnsafe<Array<{ val: string | null }>>(
            `SELECT encode("token", 'base64') as "val" FROM "ServiceAccountToken" WHERE "accountId" = $1 AND "vendor" = $2`,
            userId, 'elevenlabs'
        );
        if (tokenResults[0]?.val) {
            const tokenBytes = privacyKit.decodeBase64(tokenResults[0].val);
            elevenLabsApiKey = decryptString(['user', userId, 'vendors', 'elevenlabs', 'token'], tokenBytes);
            log({ module: 'voice' }, `Using BYOK ElevenLabs key for user ${userId}`);
        }

        // Fall back to platform key
        if (!elevenLabsApiKey) {
            elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        }

        if (!elevenLabsApiKey) {
            log({ module: 'voice' }, 'No ElevenLabs API key available (no BYOK key and no platform key)');
            return reply.code(400).send({ allowed: false, error: 'No ElevenLabs API key configured. Add your own key in Voice settings.' });
        }

        // Get 11Labs conversation token
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': elevenLabsApiKey,
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            log({ module: 'voice' }, `Failed to get 11Labs token for user ${userId}`);
            return reply.code(400).send({ 
                allowed: false,
                error: `Failed to get 11Labs token for user ${userId}`
            });
        }

        const data = await response.json() as any;
        const token = data.token;

        log({ module: 'voice' }, `Voice token issued for user ${userId}`);
        return reply.send({
            allowed: true,
            token,
            agentId
        });
    });
}
