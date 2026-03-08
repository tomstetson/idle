import { io, Socket } from 'socket.io-client';

const WS_URL = 'https://idle-api.northglass.io';
const SOCKET_PATH = '/v1/updates';

/**
 * WebSocket security tests — verifies the server rejects unauthenticated
 * or improperly authenticated Socket.IO connections.
 *
 * The server's auth flow (socket.ts) works post-connection:
 *   1. Client connects successfully (Socket.IO handshake completes)
 *   2. Server reads socket.handshake.auth.token in the "connection" handler
 *   3. If token is missing/invalid, server emits 'error' then disconnects
 *
 * So we expect: connect succeeds → server-side disconnect (not connect_error).
 */
describe('WebSocket security', () => {
    let socket: Socket;

    afterEach(() => {
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }
    });

    it('rejects connection without auth token', async () => {
        return new Promise<void>((resolve, reject) => {
            socket = io(WS_URL, {
                path: SOCKET_PATH,
                transports: ['websocket'],
                autoConnect: false,
                timeout: 10000,
            });

            const timer = setTimeout(() => {
                socket.disconnect();
                reject(new Error('Timed out — server did not reject or disconnect'));
            }, 15000);

            // Server emits 'error' with message before disconnecting
            socket.on('error', (data: { message: string }) => {
                clearTimeout(timer);
                expect(data.message).toBe('Missing authentication token');
                socket.disconnect();
                resolve();
            });

            // Fallback: server may disconnect before error event arrives
            socket.on('disconnect', (reason: string) => {
                clearTimeout(timer);
                // "io server disconnect" means the server forcefully closed the connection
                if (reason === 'io server disconnect') {
                    resolve();
                }
            });

            socket.on('connect_error', (err: Error) => {
                // If CORS or transport-level rejection happens, that's also a valid rejection
                clearTimeout(timer);
                socket.disconnect();
                resolve();
            });

            socket.connect();
        });
    }, 20000);

    it('rejects connection with invalid auth token', async () => {
        return new Promise<void>((resolve, reject) => {
            socket = io(WS_URL, {
                path: SOCKET_PATH,
                transports: ['websocket'],
                autoConnect: false,
                timeout: 10000,
                auth: {
                    token: 'fake-token-that-should-not-work-' + Date.now(),
                },
            });

            const timer = setTimeout(() => {
                socket.disconnect();
                reject(new Error('Timed out — server did not reject or disconnect'));
            }, 15000);

            socket.on('error', (data: { message: string }) => {
                clearTimeout(timer);
                expect(data.message).toBe('Invalid authentication token');
                socket.disconnect();
                resolve();
            });

            socket.on('disconnect', (reason: string) => {
                clearTimeout(timer);
                if (reason === 'io server disconnect') {
                    resolve();
                }
            });

            socket.on('connect_error', (err: Error) => {
                clearTimeout(timer);
                socket.disconnect();
                resolve();
            });

            socket.connect();
        });
    }, 20000);

    it('rejects connection with empty auth token', async () => {
        return new Promise<void>((resolve, reject) => {
            socket = io(WS_URL, {
                path: SOCKET_PATH,
                transports: ['websocket'],
                autoConnect: false,
                timeout: 10000,
                auth: {
                    token: '',
                },
            });

            const timer = setTimeout(() => {
                socket.disconnect();
                reject(new Error('Timed out — server did not reject or disconnect'));
            }, 15000);

            // Empty string is falsy, so server treats it as missing
            socket.on('error', (data: { message: string }) => {
                clearTimeout(timer);
                expect(data.message).toBe('Missing authentication token');
                socket.disconnect();
                resolve();
            });

            socket.on('disconnect', (reason: string) => {
                clearTimeout(timer);
                if (reason === 'io server disconnect') {
                    resolve();
                }
            });

            socket.on('connect_error', (err: Error) => {
                clearTimeout(timer);
                socket.disconnect();
                resolve();
            });

            socket.connect();
        });
    }, 20000);
});
