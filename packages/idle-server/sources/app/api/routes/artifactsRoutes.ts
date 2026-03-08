import { eventRouter, buildNewArtifactUpdate, buildUpdateArtifactUpdate, buildDeleteArtifactUpdate } from "@/app/events/eventRouter";
import { db } from "@/storage/db";
import { Fastify } from "../types";
import { z } from "zod";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { allocateUserSeq } from "@/storage/seq";
import { log } from "@/utils/log";
import * as privacyKit from "privacy-kit";
import { encodeBytesField } from "@/utils/encodeBytesField";

export function artifactsRoutes(app: Fastify) {
    // GET /v1/artifacts - List all artifacts for the account
    app.get('/v1/artifacts', {
        preHandler: app.authenticate,
        schema: {
            response: {
                200: z.array(z.object({
                    id: z.string(),
                    header: z.string(),
                    headerVersion: z.number(),
                    dataEncryptionKey: z.string(),
                    seq: z.number(),
                    createdAt: z.number(),
                    updatedAt: z.number()
                })),
                500: z.object({
                    error: z.literal('Failed to get artifacts')
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId;

        try {
            const artifacts = await db.artifact.findMany({
                where: { accountId: userId },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    header: true,
                    headerVersion: true,
                    dataEncryptionKey: true,
                    seq: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            return reply.send(artifacts.map(a => ({
                id: a.id,
                header: encodeBytesField(a.header)!,
                headerVersion: a.headerVersion,
                dataEncryptionKey: encodeBytesField(a.dataEncryptionKey)!,
                seq: a.seq,
                createdAt: a.createdAt.getTime(),
                updatedAt: a.updatedAt.getTime()
            })));
        } catch (error) {
            log({ module: 'api', level: 'error' }, `Failed to get artifacts: ${error}`);
            return reply.code(500).send({ error: 'Failed to get artifacts' });
        }
    });

    // GET /v1/artifacts/:id - Get single artifact with full body
    app.get('/v1/artifacts/:id', {
        preHandler: app.authenticate,
        schema: {
            params: z.object({
                id: z.string()
            }),
            response: {
                200: z.object({
                    id: z.string(),
                    header: z.string(),
                    headerVersion: z.number(),
                    body: z.string(),
                    bodyVersion: z.number(),
                    dataEncryptionKey: z.string(),
                    seq: z.number(),
                    createdAt: z.number(),
                    updatedAt: z.number()
                }),
                404: z.object({
                    error: z.literal('Artifact not found')
                }),
                500: z.object({
                    error: z.literal('Failed to get artifact')
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id } = request.params;

        try {
            const artifact = await db.artifact.findFirst({
                where: {
                    id,
                    accountId: userId
                }
            });

            if (!artifact) {
                return reply.code(404).send({ error: 'Artifact not found' });
            }

            return reply.send({
                id: artifact.id,
                header: encodeBytesField(artifact.header)!,
                headerVersion: artifact.headerVersion,
                body: encodeBytesField(artifact.body)!,
                bodyVersion: artifact.bodyVersion,
                dataEncryptionKey: encodeBytesField(artifact.dataEncryptionKey)!,
                seq: artifact.seq,
                createdAt: artifact.createdAt.getTime(),
                updatedAt: artifact.updatedAt.getTime()
            });
        } catch (error) {
            log({ module: 'api', level: 'error' }, `Failed to get artifact: ${error}`);
            return reply.code(500).send({ error: 'Failed to get artifact' });
        }
    });

    // POST /v1/artifacts - Create new artifact
    app.post('/v1/artifacts', {
        preHandler: app.authenticate,
        schema: {
            body: z.object({
                id: z.string().uuid(),
                header: z.string(),
                body: z.string(),
                dataEncryptionKey: z.string()
            }),
            response: {
                200: z.object({
                    id: z.string(),
                    header: z.string(),
                    headerVersion: z.number(),
                    body: z.string(),
                    bodyVersion: z.number(),
                    dataEncryptionKey: z.string(),
                    seq: z.number(),
                    createdAt: z.number(),
                    updatedAt: z.number()
                }),
                409: z.object({
                    error: z.literal('Artifact with this ID already exists for another account')
                }),
                500: z.object({
                    error: z.literal('Failed to create artifact')
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id, header, body, dataEncryptionKey } = request.body;

        try {
            // Check if artifact exists
            const existingArtifact = await db.artifact.findUnique({
                where: { id }
            });

            if (existingArtifact) {
                // If exists for another account, return conflict
                if (existingArtifact.accountId !== userId) {
                    return reply.code(409).send({ 
                        error: 'Artifact with this ID already exists for another account' 
                    });
                }
                
                // If exists for same account, return existing (idempotent)
                log({ module: 'api', artifactId: id, userId }, 'Found existing artifact');
                return reply.send({
                    id: existingArtifact.id,
                    header: encodeBytesField(existingArtifact.header)!,
                    headerVersion: existingArtifact.headerVersion,
                    body: encodeBytesField(existingArtifact.body)!,
                    bodyVersion: existingArtifact.bodyVersion,
                    dataEncryptionKey: encodeBytesField(existingArtifact.dataEncryptionKey)!,
                    seq: existingArtifact.seq,
                    createdAt: existingArtifact.createdAt.getTime(),
                    updatedAt: existingArtifact.updatedAt.getTime()
                });
            }

            // Create new artifact via raw SQL (PGlite + Prisma 6 bug: Bytes fields serialize as JSON objects)
            log({ module: 'api', artifactId: id, userId }, 'Creating new artifact');
            const now = new Date();
            await db.$executeRawUnsafe(
                `INSERT INTO "Artifact" ("id", "accountId", "header", "headerVersion", "body", "bodyVersion", "dataEncryptionKey", "seq", "createdAt", "updatedAt")
                 VALUES ($1, $2, decode($3, 'base64'), 1, decode($4, 'base64'), 1, decode($5, 'base64'), 0, $6, $6)`,
                id, userId, header, body, dataEncryptionKey, now
            );

            // Fetch the created artifact for the event payload (non-Bytes fields only needed for event)
            const artifact = await db.artifact.findUniqueOrThrow({ where: { id } });

            // Emit new-artifact event
            const updSeq = await allocateUserSeq(userId);
            const newArtifactPayload = buildNewArtifactUpdate(artifact, updSeq, randomKeyNaked(12));
            eventRouter.emitUpdate({
                userId,
                payload: newArtifactPayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            return reply.send({
                id,
                header,
                headerVersion: 1,
                body,
                bodyVersion: 1,
                dataEncryptionKey,
                seq: 0,
                createdAt: now.getTime(),
                updatedAt: now.getTime()
            });
        } catch (error) {
            log({ module: 'api', level: 'error' }, `Failed to create artifact: ${error}`);
            return reply.code(500).send({ error: 'Failed to create artifact' });
        }
    });

    // POST /v1/artifacts/:id - Update artifact with version control
    app.post('/v1/artifacts/:id', {
        preHandler: app.authenticate,
        schema: {
            params: z.object({
                id: z.string()
            }),
            body: z.object({
                header: z.string().optional(),
                expectedHeaderVersion: z.number().int().min(0).optional(),
                body: z.string().optional(),
                expectedBodyVersion: z.number().int().min(0).optional()
            }),
            response: {
                200: z.union([
                    z.object({
                        success: z.literal(true),
                        headerVersion: z.number().optional(),
                        bodyVersion: z.number().optional()
                    }),
                    z.object({
                        success: z.literal(false),
                        error: z.literal('version-mismatch'),
                        currentHeaderVersion: z.number().optional(),
                        currentBodyVersion: z.number().optional(),
                        currentHeader: z.string().optional(),
                        currentBody: z.string().optional()
                    })
                ]),
                404: z.object({
                    error: z.literal('Artifact not found')
                }),
                500: z.object({
                    error: z.literal('Failed to update artifact')
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id } = request.params;
        const { header, expectedHeaderVersion, body, expectedBodyVersion } = request.body;

        try {
            // Get current artifact for version check
            const currentArtifact = await db.artifact.findFirst({
                where: {
                    id,
                    accountId: userId
                }
            });

            if (!currentArtifact) {
                return reply.code(404).send({ error: 'Artifact not found' });
            }

            // Check version mismatches
            const headerMismatch = header !== undefined && expectedHeaderVersion !== undefined && 
                                   currentArtifact.headerVersion !== expectedHeaderVersion;
            const bodyMismatch = body !== undefined && expectedBodyVersion !== undefined && 
                                 currentArtifact.bodyVersion !== expectedBodyVersion;

            if (headerMismatch || bodyMismatch) {
                return reply.send({
                    success: false,
                    error: 'version-mismatch',
                    ...(headerMismatch && {
                        currentHeaderVersion: currentArtifact.headerVersion,
                        currentHeader: encodeBytesField(currentArtifact.header) ?? undefined
                    }),
                    ...(bodyMismatch && {
                        currentBodyVersion: currentArtifact.bodyVersion,
                        currentBody: encodeBytesField(currentArtifact.body) ?? undefined
                    })
                });
            }

            let headerUpdate: { value: string; version: number } | undefined;
            let bodyUpdate: { value: string; version: number } | undefined;

            // Build raw SQL UPDATE for Bytes fields (PGlite + Prisma 6 bug)
            const setClauses: string[] = [
                `"seq" = ${currentArtifact.seq + 1}`,
                `"updatedAt" = NOW()`
            ];
            const params: any[] = [id];
            let paramIdx = 2;

            if (header !== undefined && expectedHeaderVersion !== undefined) {
                setClauses.push(`"header" = decode($${paramIdx}, 'base64')`);
                params.push(header);
                paramIdx++;
                setClauses.push(`"headerVersion" = ${expectedHeaderVersion + 1}`);
                headerUpdate = { value: header, version: expectedHeaderVersion + 1 };
            }

            if (body !== undefined && expectedBodyVersion !== undefined) {
                setClauses.push(`"body" = decode($${paramIdx}, 'base64')`);
                params.push(body);
                paramIdx++;
                setClauses.push(`"bodyVersion" = ${expectedBodyVersion + 1}`);
                bodyUpdate = { value: body, version: expectedBodyVersion + 1 };
            }

            await db.$executeRawUnsafe(
                `UPDATE "Artifact" SET ${setClauses.join(', ')} WHERE "id" = $1`,
                ...params
            );

            // Emit update-artifact event
            const updSeq = await allocateUserSeq(userId);
            const updatePayload = buildUpdateArtifactUpdate(id, updSeq, randomKeyNaked(12), headerUpdate, bodyUpdate);
            eventRouter.emitUpdate({
                userId,
                payload: updatePayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            return reply.send({
                success: true,
                ...(headerUpdate && { headerVersion: headerUpdate.version }),
                ...(bodyUpdate && { bodyVersion: bodyUpdate.version })
            });
        } catch (error) {
            log({ module: 'api', level: 'error' }, `Failed to update artifact: ${error}`);
            return reply.code(500).send({ error: 'Failed to update artifact' });
        }
    });

    // DELETE /v1/artifacts/:id - Delete artifact
    app.delete('/v1/artifacts/:id', {
        preHandler: app.authenticate,
        schema: {
            params: z.object({
                id: z.string()
            }),
            response: {
                200: z.object({
                    success: z.literal(true)
                }),
                404: z.object({
                    error: z.literal('Artifact not found')
                }),
                500: z.object({
                    error: z.literal('Failed to delete artifact')
                })
            }
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id } = request.params;

        try {
            // Check if artifact exists and belongs to user
            const artifact = await db.artifact.findFirst({
                where: {
                    id,
                    accountId: userId
                }
            });

            if (!artifact) {
                return reply.code(404).send({ error: 'Artifact not found' });
            }

            // Delete artifact
            await db.artifact.delete({
                where: { id }
            });

            // Emit delete-artifact event
            const updSeq = await allocateUserSeq(userId);
            const deletePayload = buildDeleteArtifactUpdate(id, updSeq, randomKeyNaked(12));
            eventRouter.emitUpdate({
                userId,
                payload: deletePayload,
                recipientFilter: { type: 'user-scoped-only' }
            });

            return reply.send({ success: true });
        } catch (error) {
            log({ module: 'api', level: 'error' }, `Failed to delete artifact: ${error}`);
            return reply.code(500).send({ error: 'Failed to delete artifact' });
        }
    });
}