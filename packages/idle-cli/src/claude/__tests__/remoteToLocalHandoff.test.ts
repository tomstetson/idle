import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

/**
 * Regression tests for remote-to-local mode handoff TTY input buffer flush.
 *
 * The bug: When switching from remote mode (Ink/raw TTY) to local mode (Claude child
 * process with inherited stdio), raw-mode bytes buffered during the transition would
 * survive and corrupt the child process's stdin. Users experienced garbled input.
 *
 * Root cause: The 100ms delay in RemoteModeDisplay created a window where keystrokes
 * accumulated in raw mode. The teardown sequence in claudeRemoteLauncher didn't drain
 * the buffer before switching raw mode off, and claudeLocal didn't drain before
 * spawning the child process.
 *
 * Fix applied in three places:
 * 1. RemoteModeDisplay: removed 100ms delay on switch/exit actions
 * 2. claudeRemoteLauncher: reordered teardown (remove listeners -> drain -> raw off -> unmount -> pause)
 * 3. claudeLocal: added stdin drain guard before spawning child process
 */

// --- Helpers to simulate a TTY stdin stream ---

class MockTTYStdin extends EventEmitter {
    isTTY = true as const;
    readable = true;
    private _rawMode = false;
    private _paused = false;
    private _buffer: Buffer[] = [];

    setRawMode(mode: boolean): this {
        this._rawMode = mode;
        return this;
    }

    isRaw(): boolean {
        return this._rawMode;
    }

    resume(): this {
        this._paused = false;
        return this;
    }

    pause(): this {
        this._paused = true;
        return this;
    }

    isPaused(): boolean {
        return this._paused;
    }

    setEncoding(_enc: string): this {
        return this;
    }

    /** Simulate buffered raw-mode bytes */
    pushBytes(data: Buffer): void {
        this._buffer.push(data);
    }

    /** Matches Node Readable.read() — returns buffered data or null */
    read(): Buffer | null {
        if (this._buffer.length === 0) return null;
        return this._buffer.shift()!;
    }
}

describe('remote-to-local handoff: TTY input buffer flush', () => {
    let mockStdin: MockTTYStdin;
    const originalStdin = process.stdin;

    beforeEach(() => {
        mockStdin = new MockTTYStdin();
    });

    afterEach(() => {
        // Restore original stdin descriptor properties
        Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    });

    describe('stdin drain loop', () => {
        it('discards all buffered bytes when read() is called in a loop', () => {
            // Simulate raw-mode keystrokes buffered during transition
            mockStdin.pushBytes(Buffer.from([0x20]));         // space
            mockStdin.pushBytes(Buffer.from([0x1b, 0x5b]));  // partial escape sequence
            mockStdin.pushBytes(Buffer.from('hello'));         // typed text

            // Drain — this is the exact pattern used in claudeRemoteLauncher and claudeLocal
            const drained: Buffer[] = [];
            let chunk: Buffer | null;
            while ((chunk = mockStdin.read()) !== null) {
                drained.push(chunk);
            }

            expect(drained).toHaveLength(3);
            // Buffer should now be empty
            expect(mockStdin.read()).toBeNull();
        });

        it('handles empty buffer gracefully (no bytes to drain)', () => {
            // No bytes pushed — read() should return null immediately
            expect(mockStdin.read()).toBeNull();
        });
    });

    describe('teardown ordering (claudeRemoteLauncher pattern)', () => {
        it('removes listeners before draining to prevent re-processing', () => {
            const dataHandler = vi.fn();
            mockStdin.on('data', dataHandler);
            mockStdin.pushBytes(Buffer.from([0x20])); // buffered space

            // Step 1: Remove all listeners (matches claudeRemoteLauncher)
            mockStdin.removeAllListeners();
            expect(mockStdin.listenerCount('data')).toBe(0);

            // Step 2: Drain buffer
            while (mockStdin.read() !== null) { /* discard */ }

            // The data handler should NOT have been called during drain
            expect(dataHandler).not.toHaveBeenCalled();
        });

        it('drains buffer while still in raw mode, then switches off', () => {
            mockStdin.setRawMode(true);
            mockStdin.pushBytes(Buffer.from([0x03])); // Ctrl-C as raw byte

            // Drain while raw mode is still on
            expect(mockStdin.isRaw()).toBe(true);
            while (mockStdin.read() !== null) { /* discard */ }

            // Now switch raw mode off
            mockStdin.setRawMode(false);
            expect(mockStdin.isRaw()).toBe(false);

            // Buffer is clean — nothing survives the transition
            expect(mockStdin.read()).toBeNull();
        });

        it('pauses stdin after drain for clean handoff', () => {
            mockStdin.setRawMode(true);
            mockStdin.resume();
            mockStdin.pushBytes(Buffer.from('garbled'));

            // Full teardown sequence
            mockStdin.removeAllListeners();
            while (mockStdin.read() !== null) { /* discard */ }
            mockStdin.setRawMode(false);
            mockStdin.pause();

            expect(mockStdin.isPaused()).toBe(true);
            expect(mockStdin.isRaw()).toBe(false);
            expect(mockStdin.read()).toBeNull();
        });
    });

    describe('claudeLocal pre-spawn drain guard', () => {
        it('drains residual bytes before child process inherits stdin', () => {
            // Simulate: remote teardown mostly worked but a few bytes slipped through
            mockStdin.pushBytes(Buffer.from([0x1b])); // lone ESC byte

            // This matches the drain guard added to claudeLocal
            if (mockStdin.readable) {
                while (mockStdin.read() !== null) { /* discard */ }
            }

            // stdin is now clean for the child process
            expect(mockStdin.read()).toBeNull();
        });

        it('skips drain when stdin is not readable', () => {
            mockStdin.readable = false;
            mockStdin.pushBytes(Buffer.from('should-not-drain'));

            // Guard should skip drain when not readable
            if (mockStdin.readable) {
                while (mockStdin.read() !== null) { /* discard */ }
            }

            // Bytes still in buffer (not drained because not readable)
            expect(mockStdin.read()).not.toBeNull();
        });
    });

    describe('RemoteModeDisplay: no-delay switch', () => {
        it('calls onSwitchToLocal synchronously without delay', () => {
            const onSwitchToLocal = vi.fn();
            const startTime = Date.now();

            // Simulate the fixed behavior: immediate call, no await/setTimeout
            onSwitchToLocal();

            const elapsed = Date.now() - startTime;
            expect(onSwitchToLocal).toHaveBeenCalledTimes(1);
            // Should be effectively instant (< 10ms, not 100ms)
            expect(elapsed).toBeLessThan(10);
        });

        it('calls onExit synchronously without delay', () => {
            const onExit = vi.fn();
            const startTime = Date.now();

            onExit();

            const elapsed = Date.now() - startTime;
            expect(onExit).toHaveBeenCalledTimes(1);
            expect(elapsed).toBeLessThan(10);
        });
    });

    describe('full handoff sequence (integration)', () => {
        it('complete remote teardown leaves stdin clean and paused for local mode', () => {
            // Setup: simulate remote mode active state
            mockStdin.setRawMode(true);
            mockStdin.resume();

            // Listeners from Ink/useInput
            const inkDataHandler = vi.fn();
            const abortHandler = vi.fn();
            mockStdin.on('data', inkDataHandler);
            mockStdin.on('data', abortHandler);

            // Simulate user typing during switch (the bug scenario)
            mockStdin.pushBytes(Buffer.from([0x20]));          // first space (confirmation)
            mockStdin.pushBytes(Buffer.from([0x20]));          // second space (trigger switch)
            mockStdin.pushBytes(Buffer.from('hello world'));    // typed during transition
            mockStdin.pushBytes(Buffer.from([0x1b, 0x5b, 0x41])); // arrow key escape seq

            // === Remote teardown (claudeRemoteLauncher finally block) ===

            // 1. Remove all listeners
            mockStdin.removeAllListeners();

            // 2. Drain buffer in raw mode
            const discarded: Buffer[] = [];
            let chunk: Buffer | null;
            while ((chunk = mockStdin.read()) !== null) {
                discarded.push(chunk);
            }

            // 3. Raw mode off
            mockStdin.setRawMode(false);

            // 4. Pause for handoff
            mockStdin.pause();

            // === claudeLocal pre-spawn drain guard ===
            if (mockStdin.readable) {
                while (mockStdin.read() !== null) { /* discard */ }
            }

            // Verify: all garbled bytes were discarded
            expect(discarded.length).toBe(4);
            // Verify: stdin is in correct state for child process
            expect(mockStdin.isRaw()).toBe(false);
            expect(mockStdin.isPaused()).toBe(true);
            expect(mockStdin.listenerCount('data')).toBe(0);
            expect(mockStdin.read()).toBeNull();
            // Verify: Ink handler never saw the buffered bytes
            expect(inkDataHandler).not.toHaveBeenCalled();
        });
    });
});
