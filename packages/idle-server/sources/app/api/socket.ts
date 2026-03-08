import { onShutdown } from "@/utils/shutdown";
import { Fastify } from "./types";
import { buildMachineActivityEphemeral, ClientConnection, eventRouter } from "@/app/events/eventRouter";
import { Server, Socket } from "socket.io";
import { log } from "@/utils/log";
import { auth } from "@/app/auth/auth";
import { decrementWebSocketConnection, incrementWebSocketConnection, websocketEventsCounter } from "../monitoring/metrics2";
import { usageHandler } from "./socket/usageHandler";
import { rpcHandler } from "./socket/rpcHandler";
import { pingHandler } from "./socket/pingHandler";
import { sessionUpdateHandler } from "./socket/sessionUpdateHandler";
import { machineUpdateHandler } from "./socket/machineUpdateHandler";
import { artifactUpdateHandler } from "./socket/artifactUpdateHandler";
import { accessKeyHandler } from "./socket/accessKeyHandler";

// --- Rate limiting (A6-1) ---

const MAX_EVENTS_PER_MINUTE = 120;
const MAX_CONNECTIONS_PER_USER = 10;

// Per-socket event counters: socketId -> { count, resetTime }
const socketEventCounters = new Map<string, { count: number; resetTime: number }>();

// Per-user connection counters: userId -> Set<socketId>
const userConnectionTracker = new Map<string, Set<string>>();

function checkEventRateLimit(socketId: string): boolean {
    const now = Date.now();
    let entry = socketEventCounters.get(socketId);

    if (!entry || now >= entry.resetTime) {
        // Start a fresh window
        entry = { count: 1, resetTime: now + 60_000 };
        socketEventCounters.set(socketId, entry);
        return true;
    }

    entry.count++;
    if (entry.count > MAX_EVENTS_PER_MINUTE) {
        return false;
    }
    return true;
}

function trackUserConnection(userId: string, socketId: string): boolean {
    let sockets = userConnectionTracker.get(userId);
    if (!sockets) {
        sockets = new Set();
        userConnectionTracker.set(userId, sockets);
    }

    if (sockets.size >= MAX_CONNECTIONS_PER_USER) {
        return false;
    }

    sockets.add(socketId);
    return true;
}

function removeUserConnection(userId: string, socketId: string): void {
    const sockets = userConnectionTracker.get(userId);
    if (sockets) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
            userConnectionTracker.delete(userId);
        }
    }
}

function cleanupSocketRateLimit(socketId: string): void {
    socketEventCounters.delete(socketId);
}

// --- End rate limiting ---

export function startSocket(app: Fastify) {
    const allowedOrigins = [
        'https://idle.northglass.io',
        'http://localhost:8081',
        'http://localhost:19006',
    ];
    const io = new Server(app.server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"]
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 45000,
        pingInterval: 15000,
        path: '/v1/updates',
        allowUpgrades: true,
        upgradeTimeout: 10000,
        connectTimeout: 20000,
        serveClient: false // Don't serve the client files
    });

    // Per-event rate limiting middleware (A6-1)
    io.use((socket, next) => {
        socket.use(([event, ..._args], nextEvent) => {
            if (checkEventRateLimit(socket.id)) {
                nextEvent();
            } else {
                log({ module: 'websocket' }, `Rate limit exceeded for socket ${socket.id}, disconnecting`);
                socket.emit('error', { message: 'Rate limit exceeded (max 120 events/minute)' });
                socket.disconnect();
            }
        });
        next();
    });

    let rpcListeners = new Map<string, Map<string, Socket>>();
    io.on("connection", async (socket) => {
        log({ module: 'websocket' }, `New connection attempt from socket: ${socket.id}`);
        const token = socket.handshake.auth.token as string;
        const clientType = socket.handshake.auth.clientType as 'session-scoped' | 'user-scoped' | 'machine-scoped' | undefined;
        const sessionId = socket.handshake.auth.sessionId as string | undefined;
        const machineId = socket.handshake.auth.machineId as string | undefined;

        if (!token) {
            log({ module: 'websocket' }, `No token provided`);
            socket.emit('error', { message: 'Missing authentication token' });
            socket.disconnect();
            return;
        }

        // Validate session-scoped clients have sessionId
        if (clientType === 'session-scoped' && !sessionId) {
            log({ module: 'websocket' }, `Session-scoped client missing sessionId`);
            socket.emit('error', { message: 'Session ID required for session-scoped clients' });
            socket.disconnect();
            return;
        }

        // Validate machine-scoped clients have machineId
        if (clientType === 'machine-scoped' && !machineId) {
            log({ module: 'websocket' }, `Machine-scoped client missing machineId`);
            socket.emit('error', { message: 'Machine ID required for machine-scoped clients' });
            socket.disconnect();
            return;
        }

        const verified = await auth.verifyToken(token);
        if (!verified) {
            log({ module: 'websocket' }, `Invalid token provided`);
            socket.emit('error', { message: 'Invalid authentication token' });
            socket.disconnect();
            return;
        }

        const userId = verified.userId;
        log({ module: 'websocket' }, `Token verified: ${userId}, clientType: ${clientType || 'user-scoped'}, sessionId: ${sessionId || 'none'}, machineId: ${machineId || 'none'}, socketId: ${socket.id}`);

        // Per-user connection limit (A6-1)
        if (!trackUserConnection(userId, socket.id)) {
            log({ module: 'websocket' }, `Connection limit reached for user ${userId} (max ${MAX_CONNECTIONS_PER_USER})`);
            socket.emit('error', { message: `Too many connections (max ${MAX_CONNECTIONS_PER_USER} per user)` });
            socket.disconnect();
            return;
        }

        // Store connection based on type
        const metadata = { clientType: clientType || 'user-scoped', sessionId, machineId };
        let connection: ClientConnection;
        if (metadata.clientType === 'session-scoped' && sessionId) {
            connection = {
                connectionType: 'session-scoped',
                socket,
                userId,
                sessionId
            };
        } else if (metadata.clientType === 'machine-scoped' && machineId) {
            connection = {
                connectionType: 'machine-scoped',
                socket,
                userId,
                machineId
            };
        } else {
            connection = {
                connectionType: 'user-scoped',
                socket,
                userId
            };
        }
        eventRouter.addConnection(userId, connection);
        incrementWebSocketConnection(connection.connectionType);

        // Broadcast daemon online status
        if (connection.connectionType === 'machine-scoped') {
            // Broadcast daemon online
            const machineActivity = buildMachineActivityEphemeral(machineId!, true, Date.now());
            eventRouter.emitEphemeral({
                userId,
                payload: machineActivity,
                recipientFilter: { type: 'user-scoped-only' }
            });
        }

        socket.on('disconnect', () => {
            websocketEventsCounter.inc({ event_type: 'disconnect' });

            // Cleanup rate limiting and connection tracking (A6-1)
            cleanupSocketRateLimit(socket.id);
            removeUserConnection(userId, socket.id);

            // Cleanup connections
            eventRouter.removeConnection(userId, connection);
            decrementWebSocketConnection(connection.connectionType);

            log({ module: 'websocket' }, `User disconnected: ${userId}`);

            // Broadcast daemon offline status
            if (connection.connectionType === 'machine-scoped') {
                const machineActivity = buildMachineActivityEphemeral(connection.machineId, false, Date.now());
                eventRouter.emitEphemeral({
                    userId,
                    payload: machineActivity,
                    recipientFilter: { type: 'user-scoped-only' }
                });
            }
        });

        // Handlers
        let userRpcListeners = rpcListeners.get(userId);
        if (!userRpcListeners) {
            userRpcListeners = new Map<string, Socket>();
            rpcListeners.set(userId, userRpcListeners);
        }
        rpcHandler(userId, socket, userRpcListeners);
        usageHandler(userId, socket);
        sessionUpdateHandler(userId, socket, connection);
        pingHandler(socket);
        machineUpdateHandler(userId, socket);
        artifactUpdateHandler(userId, socket);
        accessKeyHandler(userId, socket);

        // Ready
        log({ module: 'websocket' }, `User connected: ${userId}`);
    });

    onShutdown('api', async () => {
        await io.close();
    });
}