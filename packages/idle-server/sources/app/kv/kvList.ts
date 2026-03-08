import { db } from "@/storage/db";

export interface KVListOptions {
    prefix?: string;
    limit?: number;
}

export interface KVListResult {
    items: Array<{
        key: string;
        value: string;
        version: number;
    }>;
}

/**
 * List all key-value pairs for the authenticated user, optionally filtered by prefix.
 * Returns keys, values, and versions. Excludes entries with null values (deleted).
 * Uses raw SQL to read Bytes value as base64 (PGlite + Prisma 6 bug: Bytes reads crash with P2023).
 */
export async function kvList(
    ctx: { uid: string },
    options?: KVListOptions
): Promise<KVListResult> {
    let query = `SELECT "key", encode("value", 'base64') as "val", "version" FROM "UserKVStore" WHERE "accountId" = $1 AND "value" IS NOT NULL`;
    const params: any[] = [ctx.uid];
    let paramIdx = 2;

    if (options?.prefix) {
        query += ` AND "key" LIKE $${paramIdx}`;
        params.push(options.prefix + '%');
        paramIdx++;
    }

    query += ` ORDER BY "key" ASC`;

    if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
    }

    const results = await db.$queryRawUnsafe<Array<{ key: string; val: string | null; version: number }>>(
        query, ...params
    );

    return {
        items: results
            .filter(r => r.val !== null)
            .map(r => ({
                key: r.key,
                value: r.val!,
                version: r.version
            }))
    };
}
