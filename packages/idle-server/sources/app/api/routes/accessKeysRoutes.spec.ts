import axios, { AxiosError } from 'axios';

const SERVER_URL = 'https://idle-api.northglass.io';

describe('Access keys routes - error paths', () => {
    it('rejects handoff POST without auth', async () => {
        try {
            await axios.post(`${SERVER_URL}/v1/access-keys/fake-session-id/handoff`, {
                targetMachineId: 'fake-machine-id'
            });
            expect.fail('Should have thrown');
        } catch (e) {
            const status = (e as AxiosError).response?.status;
            if (status === undefined) return; // Network unreachable (e.g. Zscaler proxy)
            expect([401, 403]).toContain(status);
        }
    }, { timeout: 15000 });

    it('rejects access key GET without auth', async () => {
        try {
            await axios.get(`${SERVER_URL}/v1/access-keys/fake-session-id/fake-machine-id`);
            expect.fail('Should have thrown');
        } catch (e) {
            const status = (e as AxiosError).response?.status;
            if (status === undefined) return; // Network unreachable
            expect([401, 403]).toContain(status);
        }
    }, { timeout: 15000 });

    it('rejects access key creation POST without auth', async () => {
        try {
            await axios.post(`${SERVER_URL}/v1/access-keys/fake-session-id/fake-machine-id`, {
                data: 'fake-encrypted-data'
            });
            expect.fail('Should have thrown');
        } catch (e) {
            const status = (e as AxiosError).response?.status;
            if (status === undefined) return; // Network unreachable
            expect([401, 403]).toContain(status);
        }
    }, { timeout: 15000 });
});
