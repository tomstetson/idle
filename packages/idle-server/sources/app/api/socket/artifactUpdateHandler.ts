import { websocketEventsCounter } from "@/app/monitoring/metrics2";
import { buildNewArtifactUpdate, buildUpdateArtifactUpdate, buildDeleteArtifactUpdate, eventRouter } from "@/app/events/eventRouter";
import { db } from "@/storage/db";
import { allocateUserSeq } from "@/storage/seq";
import { log } from "@/utils/log";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { Socket } from "socket.io";
import { fetchMultipleBytesFields } from "@/utils/encodeBytesField";

// Prisma select that excludes Bytes fields (PGlite + Prisma 6 bug: Bytes reads crash with P2023)
const artifactSelectNoBytes = {
    id: true,
    accountId: true,
    headerVersion: true,
    bodyVersion: true,
    seq: true,
    createdAt: true,
    updatedAt: true,
} as const;

export function artifactUpdateHandler(userId: string, socket: Socket) {
    // Read artifact with full body
    socket.on('artifact-read', async (data: {
        artifactId: string;
    }, callback: (response: any) => void) => {
        try {
            websocketEventsCounter.inc({ event_type: 'artifact-read' });

            const { artifactId } = data;

            // Validate input
            if (!artifactId) {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid parameters' });
                }
                return;
            }

            // Fetch artifact (exclude Bytes — PGlite + Prisma 6 bug)
            const artifact = await db.artifact.findFirst({
                where: { id: artifactId, accountId: userId },
                select: artifactSelectNoBytes
            });

            if (!artifact) {
                if (callback) {
                    callback({ result: 'error', message: 'Artifact not found' });
                }
                return;
            }

            // Fetch Bytes fields via raw SQL
            const bytes = await fetchMultipleBytesFields('Artifact', 'id', artifactId, ['header', 'body']);

            // Return artifact data
            callback({
                result: 'success',
                artifact: {
                    id: artifact.id,
                    header: bytes.header,
                    headerVersion: artifact.headerVersion,
                    body: bytes.body,
                    bodyVersion: artifact.bodyVersion,
                    seq: artifact.seq,
                    createdAt: artifact.createdAt.getTime(),
                    updatedAt: artifact.updatedAt.getTime()
                }
            });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in artifact-read: ${error}`);
            if (callback) {
                callback({ result: 'error', message: 'Internal error' });
            }
        }
    });

    // Update artifact with optimistic concurrency control
    socket.on('artifact-update', async (data: {
        artifactId: string;
        header?: {
            data: string;
            expectedVersion: number;
        };
        body?: {
            data: string;
            expectedVersion: number;
        };
    }, callback: (response: any) => void) => {
        try {
            websocketEventsCounter.inc({ event_type: 'artifact-update' });

            const { artifactId, header, body } = data;

            // Validate input
            if (!artifactId) {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid parameters' });
                }
                return;
            }

            // At least one update must be provided
            if (!header && !body) {
                if (callback) {
                    callback({ result: 'error', message: 'No updates provided' });
                }
                return;
            }

            // Validate header structure if provided
            if (header && (typeof header.data !== 'string' || typeof header.expectedVersion !== 'number')) {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid header parameters' });
                }
                return;
            }

            // Validate body structure if provided
            if (body && (typeof body.data !== 'string' || typeof body.expectedVersion !== 'number')) {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid body parameters' });
                }
                return;
            }

            // Get current artifact for version check (exclude Bytes — PGlite + Prisma 6 bug)
            const currentArtifact = await db.artifact.findFirst({
                where: { id: artifactId, accountId: userId },
                select: artifactSelectNoBytes
            });

            if (!currentArtifact) {
                if (callback) {
                    callback({ result: 'error', message: 'Artifact not found' });
                }
                return;
            }

            // Check for version mismatches
            const headerMismatch = header && currentArtifact.headerVersion !== header.expectedVersion;
            const bodyMismatch = body && currentArtifact.bodyVersion !== body.expectedVersion;

            if (headerMismatch || bodyMismatch) {
                // Fetch current Bytes data for mismatch response via raw SQL
                const mismatchCols: string[] = [];
                if (headerMismatch) mismatchCols.push('header');
                if (bodyMismatch) mismatchCols.push('body');
                const currentBytes = await fetchMultipleBytesFields('Artifact', 'id', artifactId, mismatchCols);

                const response: any = { result: 'version-mismatch' };

                if (headerMismatch) {
                    response.header = {
                        currentVersion: currentArtifact.headerVersion,
                        currentData: currentBytes.header
                    };
                }

                if (bodyMismatch) {
                    response.body = {
                        currentVersion: currentArtifact.bodyVersion,
                        currentData: currentBytes.body
                    };
                }

                callback(response);
                return;
            }

            // Build raw SQL UPDATE for Bytes fields (PGlite + Prisma 6 bug)
            let headerUpdate: { value: string; version: number } | undefined;
            let bodyUpdate: { value: string; version: number } | undefined;

            const setClauses: string[] = [
                `"seq" = ${currentArtifact.seq + 1}`,
                `"updatedAt" = NOW()`
            ];
            const params: any[] = [artifactId, userId];
            let paramIdx = 3;

            if (header) {
                setClauses.push(`"header" = decode($${paramIdx}, 'base64')`);
                params.push(header.data);
                paramIdx++;
                setClauses.push(`"headerVersion" = ${header.expectedVersion + 1}`);
                headerUpdate = { value: header.data, version: header.expectedVersion + 1 };
            }

            if (body) {
                setClauses.push(`"body" = decode($${paramIdx}, 'base64')`);
                params.push(body.data);
                paramIdx++;
                setClauses.push(`"bodyVersion" = ${body.expectedVersion + 1}`);
                bodyUpdate = { value: body.data, version: body.expectedVersion + 1 };
            }

            // Atomic update with version check in WHERE clause
            const versionChecks: string[] = [];
            if (header) versionChecks.push(`"headerVersion" = ${header.expectedVersion}`);
            if (body) versionChecks.push(`"bodyVersion" = ${body.expectedVersion}`);

            const result = await db.$executeRawUnsafe(
                `UPDATE "Artifact" SET ${setClauses.join(', ')} WHERE "id" = $1 AND "accountId" = $2${versionChecks.length ? ' AND ' + versionChecks.join(' AND ') : ''}`,
                ...params
            );

            if (result === 0) {
                // Re-fetch current version for mismatch response (exclude Bytes)
                const current = await db.artifact.findFirst({
                    where: { id: artifactId, accountId: userId },
                    select: artifactSelectNoBytes
                });

                // Fetch current Bytes data via raw SQL
                const mismatchCols: string[] = [];
                if (header) mismatchCols.push('header');
                if (body) mismatchCols.push('body');
                const currentBytes = mismatchCols.length > 0
                    ? await fetchMultipleBytesFields('Artifact', 'id', artifactId, mismatchCols)
                    : {};

                const response: any = { result: 'version-mismatch' };

                if (header && current) {
                    response.header = {
                        currentVersion: current.headerVersion,
                        currentData: (currentBytes as any).header ?? null
                    };
                }

                if (body && current) {
                    response.body = {
                        currentVersion: current.bodyVersion,
                        currentData: (currentBytes as any).body ?? null
                    };
                }

                callback(response);
                return;
            }

            // Emit update event
            const updSeq = await allocateUserSeq(userId);
            const updatePayload = buildUpdateArtifactUpdate(artifactId, updSeq, randomKeyNaked(12), headerUpdate, bodyUpdate);
            eventRouter.emitUpdate({
                userId,
                payload: updatePayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            // Send success response
            const response: any = { result: 'success' };

            if (headerUpdate) {
                response.header = {
                    version: headerUpdate.version,
                    data: header!.data
                };
            }

            if (bodyUpdate) {
                response.body = {
                    version: bodyUpdate.version,
                    data: body!.data
                };
            }

            callback(response);
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in artifact-update: ${error}`);
            if (callback) {
                callback({ result: 'error', message: 'Internal error' });
            }
        }
    });

    // Create new artifact via raw SQL (PGlite + Prisma 6 bug: Bytes fields serialize as JSON objects)
    socket.on('artifact-create', async (data: {
        id: string;
        header: string;
        body: string;
        dataEncryptionKey: string;
    }, callback: (response: any) => void) => {
        try {
            websocketEventsCounter.inc({ event_type: 'artifact-create' });

            const { id, header, body, dataEncryptionKey } = data;

            // Validate input
            if (!id || typeof header !== 'string' || typeof body !== 'string' || typeof dataEncryptionKey !== 'string') {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid parameters' });
                }
                return;
            }

            // Check if artifact already exists (exclude Bytes — PGlite + Prisma 6 bug)
            const existingArtifact = await db.artifact.findUnique({
                where: { id },
                select: artifactSelectNoBytes
            });

            if (existingArtifact) {
                // If exists for another account, return error
                if (existingArtifact.accountId !== userId) {
                    if (callback) {
                        callback({ result: 'error', message: 'Artifact with this ID already exists for another account' });
                    }
                    return;
                }

                // If exists for same account, return existing (idempotent)
                const bytes = await fetchMultipleBytesFields('Artifact', 'id', id, ['header', 'body']);
                callback({
                    result: 'success',
                    artifact: {
                        id: existingArtifact.id,
                        header: bytes.header,
                        headerVersion: existingArtifact.headerVersion,
                        body: bytes.body,
                        bodyVersion: existingArtifact.bodyVersion,
                        seq: existingArtifact.seq,
                        createdAt: existingArtifact.createdAt.getTime(),
                        updatedAt: existingArtifact.updatedAt.getTime()
                    }
                });
                return;
            }

            // Create new artifact via raw SQL
            const now = new Date();
            await db.$executeRawUnsafe(
                `INSERT INTO "Artifact" ("id", "accountId", "header", "headerVersion", "body", "bodyVersion", "dataEncryptionKey", "seq", "createdAt", "updatedAt")
                 VALUES ($1, $2, decode($3, 'base64'), 1, decode($4, 'base64'), 1, decode($5, 'base64'), 0, $6, $6)`,
                id, userId, header, body, dataEncryptionKey, now
            );

            // Emit new-artifact event (pass input base64 strings — no DB re-read needed)
            const updSeq = await allocateUserSeq(userId);
            const newArtifactPayload = buildNewArtifactUpdate({
                id,
                seq: 0,
                header,
                headerVersion: 1,
                body,
                bodyVersion: 1,
                dataEncryptionKey,
                createdAt: now,
                updatedAt: now
            }, updSeq, randomKeyNaked(12));
            eventRouter.emitUpdate({
                userId,
                payload: newArtifactPayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            // Return created artifact with known input values
            callback({
                result: 'success',
                artifact: {
                    id,
                    header,
                    headerVersion: 1,
                    body,
                    bodyVersion: 1,
                    seq: 0,
                    createdAt: now.getTime(),
                    updatedAt: now.getTime()
                }
            });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in artifact-create: ${error}`);
            if (callback) {
                callback({ result: 'error', message: 'Internal error' });
            }
        }
    });

    // Delete artifact
    socket.on('artifact-delete', async (data: {
        artifactId: string;
    }, callback: (response: any) => void) => {
        try {
            websocketEventsCounter.inc({ event_type: 'artifact-delete' });

            const { artifactId } = data;

            // Validate input
            if (!artifactId) {
                if (callback) {
                    callback({ result: 'error', message: 'Invalid parameters' });
                }
                return;
            }

            // Check if artifact exists and belongs to user (exclude Bytes)
            const artifact = await db.artifact.findFirst({
                where: { id: artifactId, accountId: userId },
                select: { id: true }
            });

            if (!artifact) {
                if (callback) {
                    callback({ result: 'error', message: 'Artifact not found' });
                }
                return;
            }

            // Delete artifact
            await db.artifact.delete({
                where: { id: artifactId }
            });

            // Emit delete-artifact event
            const updSeq = await allocateUserSeq(userId);
            const deletePayload = buildDeleteArtifactUpdate(artifactId, updSeq, randomKeyNaked(12));
            eventRouter.emitUpdate({
                userId,
                payload: deletePayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            // Send success response
            callback({ result: 'success' });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in artifact-delete: ${error}`);
            if (callback) {
                callback({ result: 'error', message: 'Internal error' });
            }
        }
    });
}
