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

// === V2: Session Groups ===

export interface SessionGroup {
    id: string;
    name: string;
    sessionIds: string[];
}

export interface SessionOrderV2 {
    version: 2;
    groups: SessionGroup[];
    ungrouped: string[];
}

export type SessionOrderData = string[] | SessionOrderV2;

/** Detect and normalize stored data to V2 format */
export function normalizeSessionOrder(data: unknown): SessionOrderV2 {
    if (Array.isArray(data)) {
        return migrateV1toV2(data);
    }
    if (data && typeof data === 'object' && 'version' in data && (data as any).version === 2) {
        return data as SessionOrderV2;
    }
    return { version: 2, groups: [], ungrouped: [] };
}

export function migrateV1toV2(v1: string[]): SessionOrderV2 {
    return { version: 2, groups: [], ungrouped: [...v1] };
}

export function createGroup(order: SessionOrderV2, id: string, name: string): SessionOrderV2 {
    return {
        ...order,
        groups: [...order.groups, { id, name, sessionIds: [] }]
    };
}

export function deleteGroup(order: SessionOrderV2, groupId: string): SessionOrderV2 {
    const group = order.groups.find(g => g.id === groupId);
    if (!group) return order;
    return {
        ...order,
        groups: order.groups.filter(g => g.id !== groupId),
        ungrouped: [...group.sessionIds, ...order.ungrouped]
    };
}

export function renameGroup(order: SessionOrderV2, groupId: string, name: string): SessionOrderV2 {
    return {
        ...order,
        groups: order.groups.map(g => g.id === groupId ? { ...g, name } : g)
    };
}

export function moveSessionToGroup(
    order: SessionOrderV2,
    sessionId: string,
    groupId: string | null
): SessionOrderV2 {
    // Remove session from everywhere first
    const newGroups = order.groups.map(g => ({
        ...g,
        sessionIds: g.sessionIds.filter(id => id !== sessionId)
    }));
    let newUngrouped = order.ungrouped.filter(id => id !== sessionId);

    if (groupId === null) {
        newUngrouped = [sessionId, ...newUngrouped];
    } else {
        const targetIdx = newGroups.findIndex(g => g.id === groupId);
        if (targetIdx >= 0) {
            newGroups[targetIdx] = {
                ...newGroups[targetIdx],
                sessionIds: [sessionId, ...newGroups[targetIdx].sessionIds]
            };
        }
    }

    return { ...order, groups: newGroups, ungrouped: newUngrouped };
}

export interface GroupedResult<T extends { id: string }> {
    grouped: Array<{ group: SessionGroup; sessions: T[] }>;
    ungrouped: T[];
}

export function applySessionOrderV2<T extends { id: string }>(
    sessions: T[],
    order: SessionOrderV2
): GroupedResult<T> {
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    const consumed = new Set<string>();

    const grouped = order.groups.map(group => {
        const groupSessions: T[] = [];
        for (const id of group.sessionIds) {
            const session = sessionMap.get(id);
            if (session && !consumed.has(id)) {
                groupSessions.push(session);
                consumed.add(id);
            }
        }
        return { group, sessions: groupSessions };
    });

    const ungrouped: T[] = [];
    for (const id of order.ungrouped) {
        const session = sessionMap.get(id);
        if (session && !consumed.has(id)) {
            ungrouped.push(session);
            consumed.add(id);
        }
    }
    // Append any sessions not referenced in the order at all
    for (const session of sessions) {
        if (!consumed.has(session.id)) {
            ungrouped.push(session);
        }
    }

    return { grouped, ungrouped };
}
