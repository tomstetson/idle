import { db } from "@/storage/db";
import { inTx, afterTx } from "@/storage/inTx";
import { allocateUserSeq } from "@/storage/seq";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { eventRouter, buildKVBatchUpdateUpdate } from "@/app/events/eventRouter";
import { encodeBytesField } from "@/utils/encodeBytesField";

export interface KVMutation {
    key: string;
    value: string | null; // null = delete (sets value to null but keeps record)
    version: number; // Always required, use -1 for new keys
}

export interface KVMutateResult {
    success: boolean;
    results?: Array<{
        key: string;
        version: number;
    }>;
    errors?: Array<{
        key: string;
        error: 'version-mismatch';
        version: number;
        value: string | null;  // Current value (null if deleted)
    }>;
}

/**
 * Atomically mutate multiple key-value pairs.
 * All mutations succeed or all fail.
 * Version is always required for all operations (use -1 for new keys).
 * Delete operations set value to null but keep the record with incremented version.
 * Sends a single bundled update notification for all changes.
 */
export async function kvMutate(
    ctx: { uid: string },
    mutations: KVMutation[]
): Promise<KVMutateResult> {
    return await inTx(async (tx) => {
        const errors: KVMutateResult['errors'] = [];

        // Pre-validate all mutations
        for (const mutation of mutations) {
            const existing = await tx.userKVStore.findUnique({
                where: {
                    accountId_key: {
                        accountId: ctx.uid,
                        key: mutation.key
                    }
                }
            });

            const currentVersion = existing?.version ?? -1;

            // Version check is always required
            if (currentVersion !== mutation.version) {
                errors.push({
                    key: mutation.key,
                    error: 'version-mismatch',
                    version: currentVersion,
                    value: encodeBytesField(existing?.value)
                });
            }
        }

        // If any errors, return all errors and abort
        if (errors.length > 0) {
            return { success: false, errors };
        }

        // Apply all mutations and collect results
        const results: Array<{ key: string; version: number }> = [];
        const changes: Array<{ key: string; value: string | null; version: number }> = [];

        for (const mutation of mutations) {
            if (mutation.version === -1) {
                // Create new entry via raw SQL (PGlite + Prisma 6 bug: Bytes fields serialize as JSON objects)
                if (mutation.value) {
                    await tx.$executeRawUnsafe(
                        `INSERT INTO "UserKVStore" ("accountId", "key", "value", "version", "createdAt", "updatedAt") VALUES ($1, $2, decode($3, 'base64'), 0, NOW(), NOW())`,
                        ctx.uid, mutation.key, mutation.value
                    );
                } else {
                    await tx.$executeRawUnsafe(
                        `INSERT INTO "UserKVStore" ("accountId", "key", "value", "version", "createdAt", "updatedAt") VALUES ($1, $2, NULL, 0, NOW(), NOW())`,
                        ctx.uid, mutation.key
                    );
                }

                results.push({ key: mutation.key, version: 0 });
                changes.push({ key: mutation.key, value: mutation.value, version: 0 });
            } else {
                // Update existing entry via raw SQL (including "delete" which sets value to null)
                const newVersion = mutation.version + 1;

                if (mutation.value) {
                    await tx.$executeRawUnsafe(
                        `UPDATE "UserKVStore" SET "value" = decode($1, 'base64'), "version" = $2, "updatedAt" = NOW() WHERE "accountId" = $3 AND "key" = $4`,
                        mutation.value, newVersion, ctx.uid, mutation.key
                    );
                } else {
                    await tx.$executeRawUnsafe(
                        `UPDATE "UserKVStore" SET "value" = NULL, "version" = $1, "updatedAt" = NOW() WHERE "accountId" = $2 AND "key" = $3`,
                        newVersion, ctx.uid, mutation.key
                    );
                }

                results.push({ key: mutation.key, version: newVersion });
                changes.push({ key: mutation.key, value: mutation.value, version: newVersion });
            }
        }

        // Send single bundled notification for all changes
        afterTx(tx, async () => {
            const updateSeq = await allocateUserSeq(ctx.uid);
            eventRouter.emitUpdate({
                userId: ctx.uid,
                payload: buildKVBatchUpdateUpdate(changes, updateSeq, randomKeyNaked(12)),
                recipientFilter: { type: 'user-scoped-only' }
            });
        });

        return { success: true, results };
    });
}