import { db } from "@/storage/db";

export type KVGetResult = {
    key: string;
    value: string;
    version: number;
} | null;

/**
 * Get a single key-value pair for the authenticated user.
 * Returns null if the key doesn't exist or if the value is null (deleted).
 * Uses raw SQL to read Bytes value as base64 (PGlite + Prisma 6 bug: Bytes reads crash with P2023).
 */
export async function kvGet(
    ctx: { uid: string },
    key: string
): Promise<KVGetResult> {
    const results = await db.$queryRawUnsafe<Array<{ key: string; val: string | null; version: number }>>(
        `SELECT "key", encode("value", 'base64') as "val", "version" FROM "UserKVStore" WHERE "accountId" = $1 AND "key" = $2`,
        ctx.uid, key
    );

    const result = results[0];

    // Treat missing records and null values as "not found"
    if (!result || result.val === null) {
        return null;
    }

    return {
        key: result.key,
        value: result.val,
        version: result.version
    };
}
