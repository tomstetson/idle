import { homedir } from 'node:os';
import { join } from 'node:path';

export type Config = {
    serverUrl: string;
    homeDir: string;
    credentialPath: string;
};

export function loadConfig(): Config {
    const serverUrl = (process.env.IDLE_SERVER_URL ?? 'https://idle-api.northglass.io').replace(/\/+$/, '');
    const homeDir = process.env.IDLE_HOME_DIR ?? join(homedir(), '.idle');
    const credentialPath = join(homeDir, 'agent.key');
    return { serverUrl, homeDir, credentialPath };
}
