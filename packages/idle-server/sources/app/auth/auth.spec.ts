import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { findUniqueMock } = vi.hoisted(() => {
    return {
        findUniqueMock: vi.fn(),
    };
});

// Mock db module — use relative path (tsconfig aliases don't resolve in vi.mock)
vi.mock('../../storage/db', () => ({
    db: {
        account: {
            findUnique: findUniqueMock,
        },
    },
}));

// Mock privacy-kit so auth.init() doesn't need a real master secret
vi.mock('privacy-kit', () => ({
    createPersistentTokenGenerator: vi.fn().mockResolvedValue({
        publicKey: new Uint8Array(32),
        new: vi.fn().mockResolvedValue('mock-token'),
    }),
    createPersistentTokenVerifier: vi.fn().mockResolvedValue({
        verify: vi.fn().mockResolvedValue(null),
    }),
    createEphemeralTokenGenerator: vi.fn().mockResolvedValue({
        publicKey: new Uint8Array(32),
        new: vi.fn().mockResolvedValue('mock-github-token'),
    }),
    createEphemeralTokenVerifier: vi.fn().mockResolvedValue({
        verify: vi.fn().mockResolvedValue(null),
    }),
}));

// Mock log to avoid noise
vi.mock('../../utils/log', () => ({
    log: vi.fn(),
}));

import { auth } from './auth';

describe('token account verification', () => {
    beforeEach(async () => {
        findUniqueMock.mockReset();
        process.env.IDLE_MASTER_SECRET = 'test-secret-for-auth-module';
        await auth.init();
    });

    afterEach(() => {
        // Clear the account cache between tests
        auth.invalidateAccountCache('existing-user');
        auth.invalidateAccountCache('deleted-user');
        auth.invalidateAccountCache('user-to-delete');
    });

    it('should return true when account exists in DB', async () => {
        findUniqueMock.mockResolvedValue({ id: 'existing-user' });

        const result = await auth.verifyAccountExists('existing-user');

        expect(result).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { id: 'existing-user' },
            select: { id: true },
        });
    });

    it('should return false when account does not exist in DB', async () => {
        findUniqueMock.mockResolvedValue(null);

        const result = await auth.verifyAccountExists('deleted-user');

        expect(result).toBe(false);
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { id: 'deleted-user' },
            select: { id: true },
        });
    });

    it('should cache account existence to avoid repeated DB queries', async () => {
        findUniqueMock.mockResolvedValue({ id: 'existing-user' });

        // First call hits DB
        const result1 = await auth.verifyAccountExists('existing-user');
        expect(result1).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Second call uses cache — no additional DB call
        const result2 = await auth.verifyAccountExists('existing-user');
        expect(result2).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('should re-query DB after cache is invalidated', async () => {
        // Account exists initially
        findUniqueMock.mockResolvedValue({ id: 'user-to-delete' });
        const result1 = await auth.verifyAccountExists('user-to-delete');
        expect(result1).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Invalidate cache (simulates what should happen on account deletion)
        auth.invalidateAccountCache('user-to-delete');

        // Now account is gone
        findUniqueMock.mockResolvedValue(null);
        const result2 = await auth.verifyAccountExists('user-to-delete');
        expect(result2).toBe(false);
        expect(findUniqueMock).toHaveBeenCalledTimes(2);
    });

    it('should cache non-existence so deleted accounts stay rejected', async () => {
        findUniqueMock.mockResolvedValue(null);

        const result1 = await auth.verifyAccountExists('deleted-user');
        expect(result1).toBe(false);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Second call — cached as non-existent, no DB hit
        const result2 = await auth.verifyAccountExists('deleted-user');
        expect(result2).toBe(false);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('should re-query DB after 5-minute TTL expires', async () => {
        findUniqueMock.mockResolvedValue({ id: 'existing-user' });

        const result1 = await auth.verifyAccountExists('existing-user');
        expect(result1).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Advance time past the 5-minute TTL
        const originalNow = Date.now;
        Date.now = () => originalNow() + 6 * 60 * 1000; // 6 minutes later

        const result2 = await auth.verifyAccountExists('existing-user');
        expect(result2).toBe(true);
        expect(findUniqueMock).toHaveBeenCalledTimes(2);

        // Restore Date.now
        Date.now = originalNow;
    });
});
