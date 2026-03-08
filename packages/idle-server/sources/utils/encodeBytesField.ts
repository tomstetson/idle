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
