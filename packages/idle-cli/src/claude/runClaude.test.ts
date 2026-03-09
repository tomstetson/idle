import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractResumeSessionId, hasResumeLikeFlag, resolveResumeClaudeSessionId } from './runClaude';

// Mock claudeFindLastSession for resolveResumeClaudeSessionId tests
const mockClaudeFindLastSession = vi.fn();
vi.mock('./utils/claudeFindLastSession', () => ({
    claudeFindLastSession: (...args: any[]) => mockClaudeFindLastSession(...args)
}));

// Mock logger
vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn()
    }
}));

describe('extractResumeSessionId', () => {
    it('returns null when no args provided', () => {
        expect(extractResumeSessionId(undefined)).toBeNull();
        expect(extractResumeSessionId([])).toBeNull();
    });

    it('returns null when --resume is not in args', () => {
        expect(extractResumeSessionId(['--model', 'claude-3'])).toBeNull();
    });

    it('extracts session ID from --resume <uuid>', () => {
        const sessionId = 'aada10c6-9299-4c45-abc4-91db9c0f935d';
        const result = extractResumeSessionId(['--resume', sessionId]);
        expect(result).toBe(sessionId);
    });

    it('extracts session ID from -r <uuid>', () => {
        const sessionId = 'aada10c6-9299-4c45-abc4-91db9c0f935d';
        const result = extractResumeSessionId(['-r', sessionId]);
        expect(result).toBe(sessionId);
    });

    it('returns null when --resume has no following arg', () => {
        expect(extractResumeSessionId(['--resume'])).toBeNull();
    });

    it('returns null when --resume is followed by another flag', () => {
        expect(extractResumeSessionId(['--resume', '--model'])).toBeNull();
    });

    it('returns null when --resume is followed by arg without dashes', () => {
        // Session IDs are UUIDs which contain dashes. A value without dashes
        // is not treated as a session ID.
        expect(extractResumeSessionId(['--resume', 'notauuid'])).toBeNull();
    });

    it('extracts from args with other flags present', () => {
        const sessionId = '1433467f-ff14-4292-b5b2-2aac77a808f0';
        const result = extractResumeSessionId([
            '--model', 'claude-3',
            '--resume', sessionId,
            '--dangerously-skip-permissions'
        ]);
        expect(result).toBe(sessionId);
    });

    it('does not modify the original args array', () => {
        const sessionId = 'aada10c6-9299-4c45-abc4-91db9c0f935d';
        const args = ['--resume', sessionId, '--model', 'claude-3'];
        const originalLength = args.length;

        extractResumeSessionId(args);

        expect(args.length).toBe(originalLength);
        expect(args[0]).toBe('--resume');
        expect(args[1]).toBe(sessionId);
    });

    it('handles -r at end of args', () => {
        expect(extractResumeSessionId(['-r'])).toBeNull();
    });
});

describe('hasResumeLikeFlag', () => {
    it('returns false when no args provided', () => {
        expect(hasResumeLikeFlag(undefined)).toBe(false);
        expect(hasResumeLikeFlag([])).toBe(false);
    });

    it('returns true for --resume', () => {
        expect(hasResumeLikeFlag(['--resume'])).toBe(true);
    });

    it('returns true for -r', () => {
        expect(hasResumeLikeFlag(['-r'])).toBe(true);
    });

    it('returns true for --continue', () => {
        expect(hasResumeLikeFlag(['--continue'])).toBe(true);
    });

    it('returns true for -c', () => {
        expect(hasResumeLikeFlag(['-c'])).toBe(true);
    });

    it('returns true when flag is among other args', () => {
        expect(hasResumeLikeFlag(['--model', 'claude-3', '--continue'])).toBe(true);
    });

    it('returns false when no resume/continue flags present', () => {
        expect(hasResumeLikeFlag(['--model', 'claude-3', '--verbose'])).toBe(false);
    });
});

describe('resolveResumeClaudeSessionId', () => {
    const workDir = '/test/project';

    beforeEach(() => {
        mockClaudeFindLastSession.mockReset();
    });

    it('returns explicit session ID from --resume <uuid>', () => {
        const sessionId = 'aada10c6-9299-4c45-abc4-91db9c0f935d';
        const result = resolveResumeClaudeSessionId(['--resume', sessionId], workDir);
        expect(result).toBe(sessionId);
        // Should not call claudeFindLastSession when explicit ID is present
        expect(mockClaudeFindLastSession).not.toHaveBeenCalled();
    });

    it('resolves last session for bare --resume', () => {
        const lastSessionId = 'bbbb10c6-1111-4c45-abc4-91db9c0f935d';
        mockClaudeFindLastSession.mockReturnValue(lastSessionId);

        const result = resolveResumeClaudeSessionId(['--resume'], workDir);
        expect(result).toBe(lastSessionId);
        expect(mockClaudeFindLastSession).toHaveBeenCalledWith(workDir);
    });

    it('resolves last session for --continue', () => {
        const lastSessionId = 'cccc10c6-2222-4c45-abc4-91db9c0f935d';
        mockClaudeFindLastSession.mockReturnValue(lastSessionId);

        const result = resolveResumeClaudeSessionId(['--continue'], workDir);
        expect(result).toBe(lastSessionId);
        expect(mockClaudeFindLastSession).toHaveBeenCalledWith(workDir);
    });

    it('resolves last session for -c', () => {
        const lastSessionId = 'dddd10c6-3333-4c45-abc4-91db9c0f935d';
        mockClaudeFindLastSession.mockReturnValue(lastSessionId);

        const result = resolveResumeClaudeSessionId(['-c'], workDir);
        expect(result).toBe(lastSessionId);
        expect(mockClaudeFindLastSession).toHaveBeenCalledWith(workDir);
    });

    it('returns null when bare --resume but no sessions exist', () => {
        mockClaudeFindLastSession.mockReturnValue(null);

        const result = resolveResumeClaudeSessionId(['--resume'], workDir);
        expect(result).toBeNull();
    });

    it('returns null when no resume/continue flags', () => {
        const result = resolveResumeClaudeSessionId(['--model', 'claude-3'], workDir);
        expect(result).toBeNull();
        expect(mockClaudeFindLastSession).not.toHaveBeenCalled();
    });

    it('returns null when no args provided', () => {
        const result = resolveResumeClaudeSessionId(undefined, workDir);
        expect(result).toBeNull();
    });

    it('prefers explicit session ID over claudeFindLastSession', () => {
        const explicitId = 'eeee10c6-4444-4c45-abc4-91db9c0f935d';
        mockClaudeFindLastSession.mockReturnValue('should-not-be-used');

        const result = resolveResumeClaudeSessionId(['--resume', explicitId], workDir);
        expect(result).toBe(explicitId);
        expect(mockClaudeFindLastSession).not.toHaveBeenCalled();
    });
});
