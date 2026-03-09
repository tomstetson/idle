import { describe, it, expect } from 'vitest';
import { applySessionOrder, moveSessionToTop, pruneSessionOrder } from './sessionOrder';

// Helper to create minimal session objects for testing
function session(id: string) {
    return { id };
}

describe('applySessionOrder', () => {
    it('returns sessions in custom order when all IDs match', () => {
        const sessions = [session('a'), session('b'), session('c')];
        const order = ['c', 'a', 'b'];

        const result = applySessionOrder(sessions, order);

        expect(result.map(s => s.id)).toEqual(['c', 'a', 'b']);
    });

    it('appends new sessions (not in order) at the end in original order', () => {
        const sessions = [session('a'), session('b'), session('c'), session('d')];
        const order = ['b', 'a'];

        const result = applySessionOrder(sessions, order);

        // b, a from custom order; then c, d in their original order
        expect(result.map(s => s.id)).toEqual(['b', 'a', 'c', 'd']);
    });

    it('silently prunes deleted sessions (IDs in order but not in list)', () => {
        const sessions = [session('a'), session('c')];
        const order = ['b', 'a', 'c']; // 'b' was deleted

        const result = applySessionOrder(sessions, order);

        expect(result.map(s => s.id)).toEqual(['a', 'c']);
    });

    it('returns sessions in original order when custom order is empty', () => {
        const sessions = [session('a'), session('b'), session('c')];
        const order: string[] = [];

        const result = applySessionOrder(sessions, order);

        expect(result.map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array when sessions is empty', () => {
        const sessions: { id: string }[] = [];
        const order = ['a', 'b', 'c'];

        const result = applySessionOrder(sessions, order);

        expect(result).toEqual([]);
    });

    it('handles partial overlap between order and sessions', () => {
        const sessions = [session('a'), session('b'), session('c'), session('d'), session('e')];
        const order = ['c', 'x', 'a', 'y']; // x, y are stale; b, d, e are new

        const result = applySessionOrder(sessions, order);

        // c, a from order; then b, d, e in original order
        expect(result.map(s => s.id)).toEqual(['c', 'a', 'b', 'd', 'e']);
    });

    it('preserves extra properties on session objects', () => {
        const sessions = [
            { id: 'a', name: 'Session A', updatedAt: 100 },
            { id: 'b', name: 'Session B', updatedAt: 200 },
        ];
        const order = ['b', 'a'];

        const result = applySessionOrder(sessions, order);

        expect(result[0]).toEqual({ id: 'b', name: 'Session B', updatedAt: 200 });
        expect(result[1]).toEqual({ id: 'a', name: 'Session A', updatedAt: 100 });
    });

    it('handles duplicate IDs in custom order gracefully', () => {
        const sessions = [session('a'), session('b'), session('c')];
        const order = ['b', 'a', 'b']; // 'b' appears twice

        const result = applySessionOrder(sessions, order);

        // First occurrence of 'b' wins, second is skipped (already consumed)
        expect(result.map(s => s.id)).toEqual(['b', 'a', 'c']);
    });

    it('handles single session', () => {
        const sessions = [session('a')];
        const order = ['a'];

        const result = applySessionOrder(sessions, order);

        expect(result.map(s => s.id)).toEqual(['a']);
    });
});

describe('moveSessionToTop', () => {
    it('moves an existing session to the top', () => {
        const order = ['a', 'b', 'c'];

        const result = moveSessionToTop(order, 'c');

        expect(result).toEqual(['c', 'a', 'b']);
    });

    it('prepends a session not in the current order', () => {
        const order = ['a', 'b'];

        const result = moveSessionToTop(order, 'c');

        expect(result).toEqual(['c', 'a', 'b']);
    });

    it('is a no-op when session is already at the top', () => {
        const order = ['a', 'b', 'c'];

        const result = moveSessionToTop(order, 'a');

        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('works with empty order', () => {
        const order: string[] = [];

        const result = moveSessionToTop(order, 'a');

        expect(result).toEqual(['a']);
    });

    it('does not mutate the original array', () => {
        const order = ['a', 'b', 'c'];
        const original = [...order];

        moveSessionToTop(order, 'c');

        expect(order).toEqual(original);
    });
});

describe('pruneSessionOrder', () => {
    it('removes IDs not in the valid set', () => {
        const order = ['a', 'b', 'c', 'd'];
        const valid = new Set(['a', 'c']);

        const result = pruneSessionOrder(order, valid);

        expect(result).toEqual(['a', 'c']);
    });

    it('returns empty array when no IDs are valid', () => {
        const order = ['a', 'b', 'c'];
        const valid = new Set<string>();

        const result = pruneSessionOrder(order, valid);

        expect(result).toEqual([]);
    });

    it('returns all IDs when all are valid', () => {
        const order = ['a', 'b', 'c'];
        const valid = new Set(['a', 'b', 'c']);

        const result = pruneSessionOrder(order, valid);

        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('preserves order of remaining IDs', () => {
        const order = ['d', 'b', 'e', 'a', 'c'];
        const valid = new Set(['a', 'c', 'e']);

        const result = pruneSessionOrder(order, valid);

        expect(result).toEqual(['e', 'a', 'c']);
    });

    it('handles empty order', () => {
        const order: string[] = [];
        const valid = new Set(['a', 'b']);

        const result = pruneSessionOrder(order, valid);

        expect(result).toEqual([]);
    });

    it('does not mutate the original array', () => {
        const order = ['a', 'b', 'c'];
        const original = [...order];

        pruneSessionOrder(order, new Set(['a']));

        expect(order).toEqual(original);
    });
});
