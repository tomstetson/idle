import { db } from "@/storage/db";

export interface KVBulkGetResult {
    values: Array<{
        key: string;
        value: string;
        version: number;
    }>;
}

/**
 * Get multiple key-value pairs for the authenticated user.
 * Only returns existing keys with non-null values; missing or deleted keys are omitted.
 * Uses raw SQL to read Bytes value as base64 (PGlite + Prisma 6 bug: Bytes reads crash with P2023).
 */
export async function kvBulkGet(
    ctx: { uid: string },
    keys: string[]
): Promise<KVBulkGetResult> {
    if (keys.length === 0) {
        return { values: [] };
    }

    // Build parameterized IN clause
    const keyPlaceholders = keys.map((_, i) => `$${i + 2}`).join(', ');
    const results = await db.$queryRawUnsafe<Array<{ key: string; val: string | null; version: number }>>(
        `SELECT "key", encode("value", 'base64') as "val", "version" FROM "UserKVStore" WHERE "accountId" = $1 AND "key" IN (${keyPlaceholders}) AND "value" IS NOT NULL`,
        ctx.uid, ...keys
    );

    return {
        values: results
            .filter(r => r.val !== null)
            .map(r => ({
                key: r.key,
                value: r.val!,
                version: r.version
            }))
    };
}
