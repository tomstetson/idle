import { describe, expect, it, vi } from 'vitest';
import { startIdleServer } from './startIdleServer';

/**
 * Minimal mock of ApiSessionClient for testing the change_title MCP tool handler.
 * We only need updateMetadata and sendClaudeSessionMessage to verify routing.
 */
function createMockClient() {
    return {
        sessionId: 'test-session-id',
        updateMetadata: vi.fn(),
        sendClaudeSessionMessage: vi.fn(),
    } as any;
}

/** MCP Streamable HTTP requires both application/json and text/event-stream in Accept */
const mcpHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
};

/**
 * Parse an MCP Streamable HTTP response. The transport may return JSON directly
 * or an SSE stream with JSON-RPC messages embedded in event data lines.
 */
async function parseMcpResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return response.json();
    }

    // SSE format: "event: message\ndata: {...json...}\n\n"
    const text = await response.text();
    const dataLines = text.split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => line.slice(6));

    if (dataLines.length === 0) {
        throw new Error(`No data lines in SSE response: ${text}`);
    }

    // Return the last JSON-RPC message (the tool result)
    return JSON.parse(dataLines[dataLines.length - 1]);
}

describe('startIdleServer', () => {
    it('starts and stops an MCP server', async () => {
        const client = createMockClient();
        const server = await startIdleServer(client);

        expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
        expect(server.toolNames).toEqual(['change_title']);

        server.stop();
    });

    it('change_title tool calls updateMetadata, not sendClaudeSessionMessage', async () => {
        const client = createMockClient();
        const server = await startIdleServer(client);

        try {
            // Initialize the MCP session
            const initResponse = await fetch(server.url, {
                method: 'POST',
                headers: mcpHeaders,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2025-03-26',
                        capabilities: {},
                        clientInfo: { name: 'test', version: '1.0.0' },
                    },
                }),
            });
            expect(initResponse.status).toBe(200);

            const sessionId = initResponse.headers.get('mcp-session-id');

            // Send initialized notification (required by MCP protocol)
            await fetch(server.url, {
                method: 'POST',
                headers: {
                    ...mcpHeaders,
                    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'notifications/initialized',
                }),
            });

            // Call the change_title tool
            const toolResponse = await fetch(server.url, {
                method: 'POST',
                headers: {
                    ...mcpHeaders,
                    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'change_title',
                        arguments: { title: 'Fix auth token refresh' },
                    },
                }),
            });

            expect(toolResponse.status).toBe(200);
            const toolResult = await parseMcpResponse(toolResponse) as {
                result?: { content?: Array<{ text?: string }>; isError?: boolean }
            };
            expect(toolResult.result?.content?.[0]?.text).toContain('Fix auth token refresh');
            expect(toolResult.result?.isError).toBe(false);

            // Verify routing: updateMetadata was called, sendClaudeSessionMessage was NOT
            expect(client.updateMetadata).toHaveBeenCalledTimes(1);
            expect(client.sendClaudeSessionMessage).not.toHaveBeenCalled();

            // Verify the metadata handler sets the summary correctly
            const metadataHandler = client.updateMetadata.mock.calls[0][0];
            const result = metadataHandler({ path: '/test', host: 'localhost' });
            expect(result.summary.text).toBe('Fix auth token refresh');
            expect(result.summary.updatedAt).toBeGreaterThan(0);
            // Original metadata fields preserved
            expect(result.path).toBe('/test');
            expect(result.host).toBe('localhost');
        } finally {
            server.stop();
        }
    });
});
