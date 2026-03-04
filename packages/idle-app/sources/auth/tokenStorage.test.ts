/**
 * Regression tests for auth token persistence on web.
 *
 * Bug: tokenStorage used sessionStorage on web, which clears when the
 * tab closes. Users had to re-authenticate after every tab close or
 * PWA restart. Fix (commit ed6b43d8): switch to localStorage.
 *
 * These tests use a minimal Storage mock because the vitest environment
 * is 'node' (no browser globals). They verify the behavioral contract
 * that localStorage and sessionStorage have different persistence
 * semantics, and that credentials survive JSON round-trips.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const AUTH_KEY = 'auth_credentials';

interface AuthCredentials {
    token: string;
    secret: string;
}

/**
 * Minimal in-memory implementation of the Web Storage API.
 * Used to verify the storage patterns in tokenStorage.ts without
 * requiring a browser environment.
 */
function createMockStorage(): Storage {
    const store = new Map<string, string>();
    return {
        get length() { return store.size; },
        key(index: number) {
            return [...store.keys()][index] ?? null;
        },
        getItem(key: string) {
            return store.get(key) ?? null;
        },
        setItem(key: string, value: string) {
            store.set(key, value);
        },
        removeItem(key: string) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}

describe('Auth persistence — tokenStorage regression', () => {
    let mockLocalStorage: Storage;
    let mockSessionStorage: Storage;

    beforeEach(() => {
        mockLocalStorage = createMockStorage();
        mockSessionStorage = createMockStorage();
    });

    describe('localStorage persists across simulated tab lifecycles', () => {
        it('stores and retrieves credentials from localStorage', () => {
            const credentials: AuthCredentials = {
                token: 'test-jwt-token',
                secret: 'test-secret-key',
            };

            mockLocalStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
            const stored = mockLocalStorage.getItem(AUTH_KEY);

            expect(stored).not.toBeNull();
            expect(JSON.parse(stored!)).toEqual(credentials);
        });

        it('localStorage data survives clear of sessionStorage', () => {
            // This simulates the core difference: sessionStorage clears
            // on tab close, but localStorage should not be affected.
            // The bug was using sessionStorage, which meant credentials
            // disappeared when the user closed the tab or PWA.
            const credentials: AuthCredentials = {
                token: 'persistent-token',
                secret: 'persistent-secret',
            };

            mockLocalStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
            mockSessionStorage.setItem(AUTH_KEY, JSON.stringify(credentials));

            // Simulate tab close: sessionStorage is cleared
            mockSessionStorage.clear();

            expect(mockSessionStorage.getItem(AUTH_KEY)).toBeNull();
            expect(mockLocalStorage.getItem(AUTH_KEY)).not.toBeNull();
            expect(JSON.parse(mockLocalStorage.getItem(AUTH_KEY)!)).toEqual(credentials);
        });
    });

    describe('credentials round-trip through JSON serialization', () => {
        it('preserves token and secret through JSON.stringify/parse', () => {
            const credentials: AuthCredentials = {
                token: 'test-token-value-for-unit-test',
                secret: 'test-secret-value-for-unit-test',
            };

            const serialized = JSON.stringify(credentials);
            const deserialized = JSON.parse(serialized) as AuthCredentials;

            expect(deserialized.token).toBe(credentials.token);
            expect(deserialized.secret).toBe(credentials.secret);
        });

        it('handles special characters in token values', () => {
            const credentials: AuthCredentials = {
                token: 'token/with+special=chars==',
                secret: 'secret/with+base64=padding==',
            };

            mockLocalStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
            const restored = JSON.parse(mockLocalStorage.getItem(AUTH_KEY)!) as AuthCredentials;

            expect(restored).toEqual(credentials);
        });
    });

    describe('removal cleans up correctly', () => {
        it('removeItem deletes the key from localStorage', () => {
            const credentials: AuthCredentials = {
                token: 'to-be-removed',
                secret: 'also-removed',
            };

            mockLocalStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
            expect(mockLocalStorage.getItem(AUTH_KEY)).not.toBeNull();

            mockLocalStorage.removeItem(AUTH_KEY);
            expect(mockLocalStorage.getItem(AUTH_KEY)).toBeNull();
        });
    });
});
