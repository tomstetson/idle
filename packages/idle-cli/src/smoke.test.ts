import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

describe('CLI smoke test', () => {
    const binPath = resolve(__dirname, '../bin/idle.mjs');

    it('idle --version prints version', () => {
        // --version doesn't exit cleanly (continues into auth flow which
        // fails in non-TTY), so we capture stdout from the thrown error.
        let output: string;
        try {
            output = execFileSync('node', [binPath, '--version'], {
                encoding: 'utf-8',
                timeout: 10_000,
            });
        } catch (err: any) {
            // execFileSync throws when process exits non-zero.
            // stdout still contains the version line we need.
            output = err.stdout ?? '';
        }
        expect(output).toMatch(/idle version: \d+\.\d+\.\d+/);
    });

    it('idle --help prints usage and exits 0', () => {
        const result = execFileSync('node', [binPath, '--help'], {
            encoding: 'utf-8',
            timeout: 10_000,
        });
        expect(result.toLowerCase()).toContain('idle');
    });
});
