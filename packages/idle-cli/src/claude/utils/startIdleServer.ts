/**
 * Idle MCP server
 * Provides Idle CLI specific tools including chat session title management.
 * Includes auto-title fallback: if Claude doesn't call `change_title` within
 * 30 seconds of the first assistant response, a title is generated from the
 * working directory basename and the first user message.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AddressInfo } from "node:net";
import { basename } from "node:path";
import { z } from "zod";
import { logger } from "@/ui/logger";
import { ApiSessionClient } from "@/api/apiSession";

/** How long (ms) to wait after the first assistant response before generating a fallback title */
const AUTO_TITLE_DELAY_MS = 30_000;

/** Maximum character length for the user-message portion of a fallback title */
const AUTO_TITLE_MESSAGE_MAX_LENGTH = 50;

export async function startIdleServer(client: ApiSessionClient) {
    logger.debug(`[idleMCP] server:start sessionId=${client.sessionId}`);

    // Tracks whether Claude has already set a title via the change_title tool.
    // When true the auto-title fallback is skipped.
    let titleWasSet = false;

    // Reference to the pending auto-title timer so it can be cancelled on cleanup
    let autoTitleTimer: ReturnType<typeof setTimeout> | null = null;

    // Handler that sends title updates directly via metadata.
    // Title is session metadata, not a chat message — routing through
    // sendClaudeSessionMessage caused the protocol mapper to produce
    // empty envelopes (summary messages are intentionally dropped),
    // which could trigger HTTP 500 from downstream endpoints.
    const handler = async (title: string) => {
        logger.debug('[idleMCP] Changing title to:', title);
        try {
            client.updateMetadata((metadata) => ({
                ...metadata,
                summary: {
                    text: title,
                    updatedAt: Date.now()
                }
            }));

            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    };

    //
    // Create the MCP server
    //

    const mcp = new McpServer({
        name: "Idle MCP",
        version: "1.0.0",
    });

    mcp.registerTool('change_title', {
        description: 'Set or update the chat session title. Titles should be short (under 50 chars) and action-oriented, e.g. "Fix auth token refresh".',
        title: 'Change Chat Title',
        inputSchema: {
            title: z.string().describe('The new title for the chat session'),
        },
    }, async (args) => {
        titleWasSet = true;
        const response = await handler(args.title);
        logger.debug('[idleMCP] Response:', response);
        
        if (response.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully changed chat title to: "${args.title}"`,
                    },
                ],
                isError: false,
            };
        } else {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to change chat title: ${response.error || 'Unknown error'}`,
                    },
                ],
                isError: true,
            };
        }
    });

    const transport = new StreamableHTTPServerTransport({
        // NOTE: Returning session id here will result in claude
        // sdk spawn to fail with `Invalid Request: Server already initialized`
        sessionIdGenerator: undefined
    });
    await mcp.connect(transport);

    //
    // Create the HTTP server
    //

    const server = createServer(async (req, res) => {
        try {
            await transport.handleRequest(req, res);
        } catch (error) {
            logger.debug("Error handling request:", error);
            if (!res.headersSent) {
                res.writeHead(500).end();
            }
        }
    });

    const baseUrl = await new Promise<URL>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const addr = server.address() as AddressInfo;
            resolve(new URL(`http://127.0.0.1:${addr.port}`));
        });
    });

    logger.debug(`[idleMCP] server:ready sessionId=${client.sessionId} url=${baseUrl.toString()}`);

    /**
     * Schedule a fallback title to be generated after AUTO_TITLE_DELAY_MS.
     * Call this once after the first assistant response arrives.
     * If Claude calls `change_title` before the timer fires, the fallback
     * is skipped. Safe to call multiple times — only the first call sets the timer.
     *
     * @param cwd - Working directory (used to derive the directory name portion)
     * @param firstUserMessage - Optional first user message to include in the title
     */
    function scheduleAutoTitle(cwd: string, firstUserMessage?: string): void {
        // Only schedule once
        if (autoTitleTimer) return;

        logger.debug(`[idleMCP] Scheduling auto-title fallback in ${AUTO_TITLE_DELAY_MS}ms`);

        autoTitleTimer = setTimeout(() => {
            autoTitleTimer = null;

            if (titleWasSet) {
                logger.debug('[idleMCP] Auto-title skipped — title already set by change_title tool');
                return;
            }

            const dirName = basename(cwd);
            let fallbackTitle = dirName;

            if (firstUserMessage) {
                const trimmed = firstUserMessage.trim();
                const truncated = trimmed.length > AUTO_TITLE_MESSAGE_MAX_LENGTH
                    ? trimmed.slice(0, AUTO_TITLE_MESSAGE_MAX_LENGTH - 1) + '\u2026'
                    : trimmed;
                fallbackTitle = `${dirName}: ${truncated}`;
            }

            logger.debug(`[idleMCP] Auto-title fallback fired: "${fallbackTitle}"`);
            handler(fallbackTitle);
        }, AUTO_TITLE_DELAY_MS);
    }

    return {
        url: baseUrl.toString(),
        toolNames: ['change_title'],
        scheduleAutoTitle,
        stop: () => {
            logger.debug(`[idleMCP] server:stop sessionId=${client.sessionId}`);
            if (autoTitleTimer) {
                clearTimeout(autoTitleTimer);
                autoTitleTimer = null;
            }
            mcp.close();
            server.close();
        }
    }
}
