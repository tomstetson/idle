import { db } from "@/storage/db";
import * as privacyKit from "privacy-kit";

/**
 * Safely encode a Prisma Bytes field to base64 string.
 * Handles the PGlite + Prisma 6 bug where Bytes fields may be returned as:
 * - Buffer/Uint8Array (correct behavior)
 * - JSON object like {"0":199,"1":17,...} (broken serialization)
 * - null/undefined (nullable field)
 */
export function encodeBytesField(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return privacyKit.encodeBase64(value as Uint8Array<ArrayBuffer>);
    }
    // Fallback: PGlite may return a plain object with numeric keys
    if (typeof value === 'object') {
        const values = Object.values(value as Record<string, number>);
        if (values.length > 0 && typeof values[0] === 'number') {
            const bytes = new Uint8Array(values);
            return privacyKit.encodeBase64(bytes as Uint8Array<ArrayBuffer>);
        }
    }
    if (typeof value === 'string') return value;
    return null;
}

/**
 * PGlite + Prisma 6 bug: Bytes fields cannot be read through Prisma findMany/findFirst.
 * The pglite-prisma-adapter returns bytea as JSON objects, causing Prisma to throw P2023.
 *
 * These helpers fetch Bytes columns via raw SQL with encode(..., 'base64'),
 * which returns plain text strings that bypass the broken adapter path.
 */

/** Fetch a single Bytes field as base64 for one record. */
export async function fetchBytesField(
    table: string,
    idColumn: string,
    idValue: string,
    bytesColumn: string
): Promise<string | null> {
    const result = await db.$queryRawUnsafe<Array<{ val: string | null }>>(
        `SELECT encode("${bytesColumn}", 'base64') as "val" FROM "${table}" WHERE "${idColumn}" = $1`,
        idValue
    );
    return result[0]?.val ?? null;
}

/** Fetch a Bytes field as base64 for multiple records, keyed by ID. */
export async function fetchBytesFieldMap(
    table: string,
    accountId: string,
    bytesColumn: string
): Promise<Map<string, string>> {
    const results = await db.$queryRawUnsafe<Array<{ id: string; val: string | null }>>(
        `SELECT "id", encode("${bytesColumn}", 'base64') as "val" FROM "${table}" WHERE "accountId" = $1`,
        accountId
    );
    const map = new Map<string, string>();
    for (const r of results) {
        if (r.val) map.set(r.id, r.val);
    }
    return map;
}

/** Fetch multiple Bytes fields as base64 for one record. Returns a map of column→base64. */
export async function fetchMultipleBytesFields(
    table: string,
    idColumn: string,
    idValue: string,
    bytesColumns: string[]
): Promise<Record<string, string | null>> {
    const selectCols = bytesColumns.map(c => `encode("${c}", 'base64') as "${c}"`).join(', ');
    const result = await db.$queryRawUnsafe<Array<Record<string, string | null>>>(
        `SELECT ${selectCols} FROM "${table}" WHERE "${idColumn}" = $1`,
        idValue
    );
    const row = result[0] ?? {};
    const out: Record<string, string | null> = {};
    for (const c of bytesColumns) {
        out[c] = row[c] ?? null;
    }
    return out;
}
