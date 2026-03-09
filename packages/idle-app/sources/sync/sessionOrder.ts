/**
 * Pure session ordering functions.
 *
 * These functions reorder session arrays based on a custom order (array of
 * session IDs). They have no side effects and no dependencies on RN, Expo,
 * or encryption — safe to unit-test in plain Node.
 *
 * Encrypted persistence lives in sessionOrderPersistence.ts.
 */

/**
 * Apply a custom ordering to a list of sessions.
 *
 * Sessions whose IDs appear in `customOrder` come first, in that order.
 * Sessions NOT in `customOrder` (new sessions) are appended at the end
 * in their original order. IDs in `customOrder` that don't match any
 * session (deleted sessions) are silently skipped.
 */
export function applySessionOrder<T extends { id: string }>(
    sessions: T[],
    customOrder: string[]
): T[] {
    if (customOrder.length === 0) {
        return sessions;
    }

    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    const ordered: T[] = [];

    // First: sessions in custom order
    for (const id of customOrder) {
        const session = sessionMap.get(id);
        if (session) {
            ordered.push(session);
            sessionMap.delete(id);
        }
        // Stale IDs (deleted sessions) are silently skipped
    }

    // Then: any sessions not in the custom order (new sessions), preserving original order
    for (const session of sessions) {
        if (sessionMap.has(session.id)) {
            ordered.push(session);
        }
    }

    return ordered;
}

/**
 * Move a session to the top of the ordering.
 * Returns a new order array with the session ID prepended.
 * If the session was already in the order, it's removed from its old position.
 */
export function moveSessionToTop(
    currentOrder: string[],
    sessionId: string
): string[] {
    const filtered = currentOrder.filter(id => id !== sessionId);
    return [sessionId, ...filtered];
}

/**
 * Remove stale session IDs from the order array.
 * Only keeps IDs that exist in the provided set of valid session IDs.
 */
export function pruneSessionOrder(
    currentOrder: string[],
    validSessionIds: Set<string>
): string[] {
    return currentOrder.filter(id => validSessionIds.has(id));
}
