import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config';

describe('config', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.IDLE_SERVER_URL;
        delete process.env.IDLE_HOME_DIR;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('defaults', () => {
        it('uses default server URL', () => {
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://api.cluster-fluster.com');
        });

        it('uses default home directory', () => {
            const config = loadConfig();
            expect(config.homeDir).toBe(join(homedir(), '.idle'));
        });

        it('derives credential path from home directory', () => {
            const config = loadConfig();
            expect(config.credentialPath).toBe(join(homedir(), '.idle', 'agent.key'));
        });
    });

    describe('env var overrides', () => {
        it('overrides server URL with IDLE_SERVER_URL', () => {
            process.env.IDLE_SERVER_URL = 'https://custom-server.example.com';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://custom-server.example.com');
        });

        it('overrides home directory with IDLE_HOME_DIR', () => {
            process.env.IDLE_HOME_DIR = '/tmp/custom-idle';
            const config = loadConfig();
            expect(config.homeDir).toBe('/tmp/custom-idle');
        });

        it('derives credential path from overridden home directory', () => {
            process.env.IDLE_HOME_DIR = '/tmp/custom-idle';
            const config = loadConfig();
            expect(config.credentialPath).toBe('/tmp/custom-idle/agent.key');
        });

        it('allows both overrides simultaneously', () => {
            process.env.IDLE_SERVER_URL = 'https://other.example.com';
            process.env.IDLE_HOME_DIR = '/opt/idle';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://other.example.com');
            expect(config.homeDir).toBe('/opt/idle');
            expect(config.credentialPath).toBe('/opt/idle/agent.key');
        });
    });
});
