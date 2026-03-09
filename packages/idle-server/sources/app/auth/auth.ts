import * as privacyKit from "privacy-kit";
import { log } from "@/utils/log";
import { db } from "@/storage/db";

const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const TOKEN_CACHE_MAX_SIZE = 10_000;
const TOKEN_TTL_DAYS = process.env.IDLE_TOKEN_TTL_DAYS
    ? parseInt(process.env.IDLE_TOKEN_TTL_DAYS, 10)
    : 30;
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const ACCOUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — short enough to catch deletions quickly
const ACCOUNT_CACHE_MAX_SIZE = 10_000;

interface AccountCacheEntry {
    exists: boolean;
    cachedAt: number;
}

interface TokenCacheEntry {
    userId: string;
    extras?: any;
    cachedAt: number;
}

interface AuthTokens {
    generator: Awaited<ReturnType<typeof privacyKit.createPersistentTokenGenerator>>;
    verifier: Awaited<ReturnType<typeof privacyKit.createPersistentTokenVerifier>>;
    githubVerifier: Awaited<ReturnType<typeof privacyKit.createEphemeralTokenVerifier>>;
    githubGenerator: Awaited<ReturnType<typeof privacyKit.createEphemeralTokenGenerator>>;
}

class AuthModule {
    private tokenCache = new Map<string, TokenCacheEntry>();
    private accountCache = new Map<string, AccountCacheEntry>();
    private revokedTokens = new Map<string, number>(); // token → expiresAt; auto-swept on revoke
    private tokens: AuthTokens | null = null;
    
    async init(): Promise<void> {
        if (this.tokens) {
            return; // Already initialized
        }
        
        log({ module: 'auth' }, 'Initializing auth module...');
        
        const generator = await privacyKit.createPersistentTokenGenerator({
            service: 'idle',
            seed: process.env.IDLE_MASTER_SECRET!
        });

        
        const verifier = await privacyKit.createPersistentTokenVerifier({
            service: 'idle',
            publicKey: Uint8Array.from(generator.publicKey)
        });
        
        const githubGenerator = await privacyKit.createEphemeralTokenGenerator({
            service: 'github-idle',
            seed: process.env.IDLE_MASTER_SECRET!,
            ttl: 5 * 60 * 1000 // 5 minutes
        });

        const githubVerifier = await privacyKit.createEphemeralTokenVerifier({
            service: 'github-idle',
            publicKey: Uint8Array.from(githubGenerator.publicKey),
        });


        this.tokens = { generator, verifier, githubVerifier, githubGenerator };
        
        log({ module: 'auth' }, 'Auth module initialized');
    }
    
    private isTokenExpired(extras?: any): boolean {
        if (!extras?.expiresAt) {
            return true; // Legacy tokens without expiresAt are treated as expired
        }
        return Date.now() > extras.expiresAt;
    }

    async createToken(userId: string, extras?: any): Promise<string> {
        if (!this.tokens) {
            throw new Error('Auth module not initialized');
        }

        const expiresAt = Date.now() + TOKEN_TTL_MS;
        const tokenExtras = { ...extras, expiresAt };

        const payload: any = { user: userId, extras: tokenExtras };

        const token = await this.tokens.generator.new(payload);

        // Cache the token immediately
        this.tokenCache.set(token, {
            userId,
            extras: tokenExtras,
            cachedAt: Date.now()
        });

        return token;
    }
    
    async verifyToken(token: string): Promise<{ userId: string; extras?: any } | null> {
        // Reject revoked tokens before anything else
        if (this.revokedTokens.has(token)) {
            return null;
        }

        // Check cache first (with TTL)
        const cached = this.tokenCache.get(token);
        if (cached) {
            if (Date.now() - cached.cachedAt > TOKEN_CACHE_TTL) {
                this.tokenCache.delete(token);
            } else if (this.isTokenExpired(cached.extras)) {
                this.tokenCache.delete(token);
                return null;
            } else {
                return {
                    userId: cached.userId,
                    extras: cached.extras
                };
            }
        }
        
        // Cache miss - verify token
        if (!this.tokens) {
            throw new Error('Auth module not initialized');
        }
        
        try {
            const verified = await this.tokens.verifier.verify(token);
            if (!verified) {
                return null;
            }
            
            const userId = verified.user as string;
            const extras = verified.extras;

            if (this.isTokenExpired(extras)) {
                return null;
            }

            // Evict oldest entries if cache is too large
            if (this.tokenCache.size >= TOKEN_CACHE_MAX_SIZE) {
                const oldest = [...this.tokenCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
                if (oldest) this.tokenCache.delete(oldest[0]);
            }
            // Cache the result with TTL
            this.tokenCache.set(token, {
                userId,
                extras,
                cachedAt: Date.now()
            });
            
            return { userId, extras };
            
        } catch (error) {
            log({ module: 'auth', level: 'error' }, `Token verification failed: ${error}`);
            return null;
        }
    }
    
    invalidateUserTokens(userId: string): void {
        // Remove all tokens for a specific user
        // This is expensive but rarely needed
        for (const [token, entry] of this.tokenCache.entries()) {
            if (entry.userId === userId) {
                this.tokenCache.delete(token);
            }
        }
        
        log({ module: 'auth' }, `Invalidated tokens for user: ${userId}`);
    }
    
    invalidateToken(token: string): void {
        this.tokenCache.delete(token);
    }

    /** Permanently revoke a token. Auto-sweeps expired entries to prevent unbounded growth. */
    revokeToken(token: string): void {
        this.tokenCache.delete(token);

        // Store with expiry so we can sweep later (default: TOKEN_TTL from now)
        this.revokedTokens.set(token, Date.now() + TOKEN_TTL_MS);

        // Sweep expired revocations to bound memory growth
        const now = Date.now();
        for (const [t, expiresAt] of this.revokedTokens) {
            if (now > expiresAt) {
                this.revokedTokens.delete(t);
            }
        }

        log({ module: 'auth' }, `Token revoked (${this.revokedTokens.size} active revocations)`);
    }

    /**
     * Check if an account still exists in the DB, with in-memory cache.
     * Returns false for deleted accounts so the auth middleware can return 401
     * instead of letting requests through to fail with FK constraint errors.
     */
    async verifyAccountExists(userId: string): Promise<boolean> {
        const cached = this.accountCache.get(userId);
        if (cached && (Date.now() - cached.cachedAt < ACCOUNT_CACHE_TTL)) {
            return cached.exists;
        }

        // Cache miss or expired — query DB
        const account = await db.account.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        const exists = account !== null;

        // Evict oldest entry if cache is full
        if (this.accountCache.size >= ACCOUNT_CACHE_MAX_SIZE) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;
            for (const [key, entry] of this.accountCache.entries()) {
                if (entry.cachedAt < oldestTime) {
                    oldestTime = entry.cachedAt;
                    oldestKey = key;
                }
            }
            if (oldestKey) this.accountCache.delete(oldestKey);
        }

        this.accountCache.set(userId, { exists, cachedAt: Date.now() });
        return exists;
    }

    /** Remove a user from the account existence cache (call on account deletion). */
    invalidateAccountCache(userId: string): void {
        this.accountCache.delete(userId);
    }

    getCacheStats(): { size: number; oldestEntry: number | null } {
        if (this.tokenCache.size === 0) {
            return { size: 0, oldestEntry: null };
        }
        
        let oldest = Date.now();
        for (const entry of this.tokenCache.values()) {
            if (entry.cachedAt < oldest) {
                oldest = entry.cachedAt;
            }
        }
        
        return {
            size: this.tokenCache.size,
            oldestEntry: oldest
        };
    }
    
    async createGithubToken(userId: string): Promise<string> {
        if (!this.tokens) {
            throw new Error('Auth module not initialized');
        }
        
        const payload = { user: userId, purpose: 'github-oauth' };
        const token = await this.tokens.githubGenerator.new(payload);
        
        return token;
    }

    async verifyGithubToken(token: string): Promise<{ userId: string } | null> {
        if (!this.tokens) {
            throw new Error('Auth module not initialized');
        }
        
        try {
            const verified = await this.tokens.githubVerifier.verify(token);
            if (!verified) {
                return null;
            }
            
            return { userId: verified.user as string };
        } catch (error) {
            log({ module: 'auth', level: 'error' }, `GitHub token verification failed: ${error}`);
            return null;
        }
    }

    // Cleanup old entries (optional - can be called periodically)
    cleanup(): void {
        // Note: Since tokens are cached "forever" as requested,
        // we don't do automatic cleanup. This method exists if needed later.
        const stats = this.getCacheStats();
        log({ module: 'auth' }, `Token cache size: ${stats.size} entries`);
    }
}

// Global instance
export const auth = new AuthModule();