import axios, { AxiosError } from 'axios';

const SERVER_URL = 'https://idle-api.northglass.io';

describe('Push routes - error paths', () => {
    it('rejects push token registration without auth', async () => {
        try {
            await axios.post(`${SERVER_URL}/v1/push-tokens`, {
                token: 'fake-expo-push-token'
            });
            expect.fail('Should have thrown');
        } catch (e) {
            expect((e as AxiosError).response?.status).toBe(401);
        }
    }, { timeout: 15000 });

    it('rejects push token listing without auth', async () => {
        try {
            await axios.get(`${SERVER_URL}/v1/push-tokens`);
            expect.fail('Should have thrown');
        } catch (e) {
            expect((e as AxiosError).response?.status).toBe(401);
        }
    }, { timeout: 15000 });

    it('rejects push token deletion without auth', async () => {
        try {
            await axios.delete(`${SERVER_URL}/v1/push-tokens/fake-token`);
            expect.fail('Should have thrown');
        } catch (e) {
            expect((e as AxiosError).response?.status).toBe(401);
        }
    }, { timeout: 15000 });
});
