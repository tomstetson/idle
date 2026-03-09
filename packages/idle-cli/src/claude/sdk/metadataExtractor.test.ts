import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the query module before importing the extractor
const mockQueryIterator = {
    [Symbol.asyncIterator]: vi.fn()
}
const mockQuery = vi.fn().mockReturnValue(mockQueryIterator)
vi.mock('./query', () => ({
    query: (...args: any[]) => mockQuery(...args)
}))

// Mock logger
vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn()
    }
}))

import { extractSDKMetadata, extractSDKMetadataAsync } from './metadataExtractor'
import type { SDKMetadata } from './metadataExtractor'
import type { Metadata } from '@/api/types'

describe('metadataExtractor', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Metadata type accepts commandDescriptions', () => {
        it('allows commandDescriptions as an optional field', () => {
            // Type-level validation: this would fail at compile time
            // if commandDescriptions were not part of the Metadata type
            const metadata: Metadata = {
                path: '/test',
                host: 'localhost',
                homeDir: '/home/test',
                idleHomeDir: '/home/test/.idle',
                idleLibDir: '/usr/lib/idle',
                idleToolsDir: '/usr/lib/idle/tools',
                tools: ['Bash', 'Read'],
                slashCommands: ['compact', 'clear', 'my-custom-command'],
                commandDescriptions: {
                    compact: 'Compact conversation',
                    clear: 'Clear conversation',
                    'my-custom-command': 'A project-specific custom command'
                }
            }

            expect(metadata.commandDescriptions).toBeDefined()
            expect(metadata.commandDescriptions!['my-custom-command']).toBe('A project-specific custom command')
        })

        it('allows metadata without commandDescriptions', () => {
            const metadata: Metadata = {
                path: '/test',
                host: 'localhost',
                homeDir: '/home/test',
                idleHomeDir: '/home/test/.idle',
                idleLibDir: '/usr/lib/idle',
                idleToolsDir: '/usr/lib/idle/tools'
            }

            expect(metadata.commandDescriptions).toBeUndefined()
        })
    })

    describe('extractSDKMetadata', () => {
        it('passes cwd to the query function', async () => {
            // Set up the mock to return an empty async iterator (no init message)
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockResolvedValue({ done: true, value: undefined })
            })

            await extractSDKMetadata('/my/project/dir')

            expect(mockQuery).toHaveBeenCalledTimes(1)
            const callArgs = mockQuery.mock.calls[0][0]
            expect(callArgs.options.cwd).toBe('/my/project/dir')
        })

        it('defaults cwd to process.cwd() when not provided', async () => {
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockResolvedValue({ done: true, value: undefined })
            })

            await extractSDKMetadata()

            expect(mockQuery).toHaveBeenCalledTimes(1)
            const callArgs = mockQuery.mock.calls[0][0]
            expect(callArgs.options.cwd).toBe(process.cwd())
        })

        it('extracts tools, slashCommands, and commandDescriptions from init message', async () => {
            const initMessage = {
                type: 'system',
                subtype: 'init',
                tools: ['Bash', 'Read', 'Edit'],
                slash_commands: ['compact', 'clear', 'deploy'],
                slash_command_descriptions: {
                    compact: 'Compact the conversation',
                    clear: 'Clear conversation history',
                    deploy: 'Deploy to production'
                }
            }

            let callCount = 0
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockImplementation(() => {
                    if (callCount === 0) {
                        callCount++
                        return Promise.resolve({ done: false, value: initMessage })
                    }
                    return Promise.resolve({ done: true, value: undefined })
                })
            })

            const result = await extractSDKMetadata('/test')

            expect(result.tools).toEqual(['Bash', 'Read', 'Edit'])
            expect(result.slashCommands).toEqual(['compact', 'clear', 'deploy'])
            expect(result.commandDescriptions).toEqual({
                compact: 'Compact the conversation',
                clear: 'Clear conversation history',
                deploy: 'Deploy to production'
            })
        })

        it('returns empty metadata when no init message is received', async () => {
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockResolvedValue({ done: true, value: undefined })
            })

            const result = await extractSDKMetadata('/test')

            expect(result).toEqual({})
        })

        it('returns empty metadata on non-abort errors', async () => {
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockRejectedValue(new Error('spawn failed'))
            })

            const result = await extractSDKMetadata('/test')

            expect(result).toEqual({})
        })

        it('handles init message without slash_command_descriptions', async () => {
            const initMessage = {
                type: 'system',
                subtype: 'init',
                tools: ['Bash'],
                slash_commands: ['compact']
                // no slash_command_descriptions
            }

            let callCount = 0
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockImplementation(() => {
                    if (callCount === 0) {
                        callCount++
                        return Promise.resolve({ done: false, value: initMessage })
                    }
                    return Promise.resolve({ done: true, value: undefined })
                })
            })

            const result = await extractSDKMetadata('/test')

            expect(result.tools).toEqual(['Bash'])
            expect(result.slashCommands).toEqual(['compact'])
            expect(result.commandDescriptions).toBeUndefined()
        })
    })

    describe('extractSDKMetadataAsync', () => {
        it('forwards cwd to extractSDKMetadata', async () => {
            const initMessage = {
                type: 'system',
                subtype: 'init',
                tools: ['Bash'],
                slash_commands: ['compact'],
                slash_command_descriptions: { compact: 'Compact conversation' }
            }

            let callCount = 0
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockImplementation(() => {
                    if (callCount === 0) {
                        callCount++
                        return Promise.resolve({ done: false, value: initMessage })
                    }
                    return Promise.resolve({ done: true, value: undefined })
                })
            })

            const onComplete = vi.fn()
            extractSDKMetadataAsync(onComplete, '/custom/project/path')

            // Wait for the async promise chain to resolve
            await vi.waitFor(() => {
                expect(onComplete).toHaveBeenCalledTimes(1)
            })

            expect(mockQuery).toHaveBeenCalledTimes(1)
            expect(mockQuery.mock.calls[0][0].options.cwd).toBe('/custom/project/path')

            const metadata: SDKMetadata = onComplete.mock.calls[0][0]
            expect(metadata.tools).toEqual(['Bash'])
            expect(metadata.slashCommands).toEqual(['compact'])
            expect(metadata.commandDescriptions).toEqual({ compact: 'Compact conversation' })
        })

        it('does not call onComplete when no metadata is extracted', async () => {
            mockQueryIterator[Symbol.asyncIterator].mockReturnValue({
                next: vi.fn().mockResolvedValue({ done: true, value: undefined })
            })

            const onComplete = vi.fn()
            extractSDKMetadataAsync(onComplete, '/test')

            // Give the promise chain time to resolve
            await new Promise(resolve => setTimeout(resolve, 50))

            expect(onComplete).not.toHaveBeenCalled()
        })
    })
})
