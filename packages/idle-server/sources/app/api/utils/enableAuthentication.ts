import { Fastify } from "../types";
import { log } from "@/utils/log";
import { auth } from "@/app/auth/auth";

export function enableAuthentication(app: Fastify) {
    app.decorate('authenticate', async function (request: any, reply: any) {
        try {
            const authHeader = request.headers.authorization;
            log({ module: 'auth-decorator' }, `Auth check - path: ${request.url}, has auth: ${!!authHeader}`);
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                log({ module: 'auth-decorator' }, `Auth failed - missing or invalid header`);
                return reply.code(401).send({ error: 'Missing authorization header' });
            }

            const token = authHeader.substring(7);
            const verified = await auth.verifyToken(token);
            if (!verified) {
                log({ module: 'auth-decorator' }, `Auth failed - invalid token`);
                return reply.code(401).send({ error: 'Invalid token' });
            }

            // Verify the account still exists in the DB (cached, 5-min TTL).
            // Without this, deleted accounts pass token auth but fail on FK constraints.
            const accountExists = await auth.verifyAccountExists(verified.userId);
            if (!accountExists) {
                log({ module: 'auth-decorator' }, `Auth failed - account not found: ${verified.userId}`);
                return reply.code(401).send({ error: 'Account not found' });
            }

            log({ module: 'auth-decorator' }, `Auth success - user: ${verified.userId}`);
            request.userId = verified.userId;
        } catch (error) {
            return reply.code(401).send({ error: 'Authentication failed' });
        }
    });
}