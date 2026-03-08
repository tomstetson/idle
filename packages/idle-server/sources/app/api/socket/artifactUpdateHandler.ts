import { websocketEventsCounter } from "@/app/monitoring/metrics2";
import { buildNewArtifactUpdate, buildUpdateArtifactUpdate, buildDeleteArtifactUpdate, eventRouter } from "@/app/events/eventRouter";
import { db } from "@/storage/db";
import { allocateUserSeq } from "@/storage/seq";
import { log } from "@/utils/log";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { Socket } from "socket.io";
import { encodeBytesField } from "@/utils/encodeBytesField";

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

            // Fetch artifact
            const artifact = await db.artifact.findFirst({
                where: {
                    id: artifactId,
                    accountId: userId
                }
            });

            if (!artifact) {
                if (callback) {
                    callback({ result: 'error', message: 'Artifact not found' });
                }
                return;
            }

            // Return artifact data
            callback({
                result: 'success',
                artifact: {
                    id: artifact.id,
                    header: encodeBytesField(artifact.header),
                    headerVersion: artifact.headerVersion,
                    body: encodeBytesField(artifact.body),
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

            // Get current artifact for version check
            const currentArtifact = await db.artifact.findFirst({
                where: {
                    id: artifactId,
                    accountId: userId
                }
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
                const response: any = { result: 'version-mismatch' };

                if (headerMismatch) {
                    response.header = {
                        currentVersion: currentArtifact.headerVersion,
                        currentData: encodeBytesField(currentArtifact.header)
                    };
                }

                if (bodyMismatch) {
                    response.body = {
                        currentVersion: currentArtifact.bodyVersion,
                        currentData: encodeBytesField(currentArtifact.body)
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
                // Re-fetch current version for mismatch response
                const current = await db.artifact.findFirst({
                    where: {
                        id: artifactId,
                        accountId: userId
                    }
                });

                const response: any = { result: 'version-mismatch' };

                if (header && current) {
                    response.header = {
                        currentVersion: current.headerVersion,
                        currentData: encodeBytesField(current.header)
                    };
                }

                if (body && current) {
                    response.body = {
                        currentVersion: current.bodyVersion,
                        currentData: encodeBytesField(current.body)
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

            // Check if artifact already exists
            const existingArtifact = await db.artifact.findUnique({
                where: { id }
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
                callback({
                    result: 'success',
                    artifact: {
                        id: existingArtifact.id,
                        header: encodeBytesField(existingArtifact.header),
                        headerVersion: existingArtifact.headerVersion,
                        body: encodeBytesField(existingArtifact.body),
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

            // Fetch for event payload
            const artifact = await db.artifact.findUniqueOrThrow({ where: { id } });

            // Emit new-artifact event
            const updSeq = await allocateUserSeq(userId);
            const newArtifactPayload = buildNewArtifactUpdate(artifact, updSeq, randomKeyNaked(12));
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

            // Check if artifact exists and belongs to user
            const artifact = await db.artifact.findFirst({
                where: {
                    id: artifactId,
                    accountId: userId
                }
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
