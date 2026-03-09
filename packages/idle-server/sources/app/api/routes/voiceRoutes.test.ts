import fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Fastify } from "../types";

// Mock the log utility to suppress noise
vi.mock("../../../utils/log", () => ({
    log: vi.fn()
}));

// Track fetch calls for ElevenLabs API
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function createApp() {
    const app = fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const typed = app.withTypeProvider<ZodTypeProvider>() as unknown as Fastify;

    typed.decorate("authenticate", async (request: any, reply: any) => {
        const userId = request.headers["x-user-id"];
        if (typeof userId !== "string") {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        request.userId = userId;
    });

    // Import after mocks are set up
    const { voiceRoutes } = await import("./voiceRoutes");
    voiceRoutes(typed);
    await typed.ready();
    return typed;
}

describe("voiceRoutes", () => {
    let app: Fastify;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        fetchMock.mockReset();
        process.env.ELEVENLABS_API_KEY = "test-api-key";
        // Alpha mode — no subscription required by default
        delete process.env.IDLE_REQUIRE_SUBSCRIPTION;
    });

    afterEach(async () => {
        process.env = { ...originalEnv };
        if (app) {
            await app.close();
        }
    });

    it("returns 401 without auth header", async () => {
        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            payload: { agentId: "agent-123" }
        });

        expect(response.statusCode).toBe(401);
    });

    it("returns token when ElevenLabs API key is configured", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "elevenlabs-conv-token-abc" })
        });

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123" }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.allowed).toBe(true);
        expect(body.token).toBe("elevenlabs-conv-token-abc");
        expect(body.agentId).toBe("agent-123");

        // Verify correct ElevenLabs API call
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent-123",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    "xi-api-key": "test-api-key"
                })
            })
        );
    });

    it("returns 400 when ElevenLabs API key is missing", async () => {
        delete process.env.ELEVENLABS_API_KEY;

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123" }
        });

        expect(response.statusCode).toBe(400);
        const body = response.json();
        expect(body.allowed).toBe(false);
        expect(body.error).toContain("11Labs API key");
    });

    it("returns 400 when ElevenLabs token fetch fails", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123" }
        });

        expect(response.statusCode).toBe(400);
        const body = response.json();
        expect(body.allowed).toBe(false);
    });

    it("skips subscription check when IDLE_REQUIRE_SUBSCRIPTION is not set (alpha mode)", async () => {
        // In alpha, voice should work without RevenueCat — goes straight to ElevenLabs
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "token-abc" })
        });

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123" }
            // No revenueCatPublicKey in payload
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.allowed).toBe(true);
        expect(body.token).toBe("token-abc");

        // Only one fetch call (to ElevenLabs), not two (no RevenueCat)
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("requires subscription when IDLE_REQUIRE_SUBSCRIPTION is 'true' and no key provided", async () => {
        process.env.IDLE_REQUIRE_SUBSCRIPTION = "true";
        // Not in development
        process.env.NODE_ENV = "production";
        delete process.env.ENV;

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123" }
        });

        expect(response.statusCode).toBe(400);
        const body = response.json();
        expect(body.allowed).toBe(false);
        expect(body.error).toBe("Subscription required");
    });

    it("rejects user without active subscription when subscription check is enabled", async () => {
        process.env.IDLE_REQUIRE_SUBSCRIPTION = "true";
        process.env.NODE_ENV = "production";
        delete process.env.ENV;

        // RevenueCat returns no active entitlements
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                subscriber: {
                    entitlements: { active: {} }
                }
            })
        });

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123", revenueCatPublicKey: "rc-key-123" }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.allowed).toBe(false);
    });

    it("allows subscribed user and returns ElevenLabs token", async () => {
        process.env.IDLE_REQUIRE_SUBSCRIPTION = "true";
        process.env.NODE_ENV = "production";
        delete process.env.ENV;

        // First fetch: RevenueCat says user has pro entitlement
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                subscriber: {
                    entitlements: {
                        active: { pro: { expires_date: "2099-01-01" } }
                    }
                }
            })
        });
        // Second fetch: ElevenLabs returns token
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "conv-token" })
        });

        app = await createApp();
        const response = await app.inject({
            method: "POST",
            url: "/v1/voice/token",
            headers: { "x-user-id": "user-1" },
            payload: { agentId: "agent-123", revenueCatPublicKey: "rc-key-123" }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.allowed).toBe(true);
        expect(body.token).toBe("conv-token");
        expect(body.agentId).toBe("agent-123");
    });
});
