import { readFileSync } from 'node:fs'
import { loggerSetup } from '@nrchkb/logger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBuildNodes } from '../test-utils/build-node-loader'
import { switchServiceBridgeFlow } from '../test-utils/data'

const debug = require('debug')

afterEach(() => {
    vi.restoreAllMocks()
    loggerSetup({ debugEnabled: false, traceEnabled: false })
})

const createRuntime = () => {
    const { nrchkb } = loadBuildNodes()
    let constructor: (this: unknown, config: { logLevel?: string }) => void
    const routes = new Map<string, (...args: any[]) => unknown>()
    const RED = {
        settings: { available: () => true, userDir: '/tmp/nrchkb-vitest' },
        auth: { needsPermission: () => () => undefined },
        httpAdmin: {
            get: (path: string, _permission: unknown, handler: any) =>
                routes.set(path, handler),
            post: vi.fn(),
        },
        nodes: {
            createNode: vi.fn(),
            registerType: (_type: string, callback: typeof constructor) => {
                constructor = callback
            },
            eachNode: vi.fn(),
            getNode: vi.fn(),
        },
    }
    const initialization = nrchkb(RED)
    return {
        initialization,
        routes,
        deploy: (logLevel?: string) => {
            let close = () => undefined
            constructor.call(
                {
                    on: (_event: string, callback: typeof close) =>
                        (close = callback),
                },
                { logLevel }
            )
            return () => close()
        },
    }
}

describe('NRCHKB logging', () => {
    it.each([0, 1])(
        'updates inherited host logging without recreating host type %s',
        async (hostType) => {
            loggerSetup({ debugEnabled: true, errorEnabled: true })
            const output = vi
                .spyOn(debug, 'log')
                .mockImplementation(() => undefined)
            const runtime = createRuntime()
            await runtime.initialization
            const HostFactory = require('../../../build/lib/HAPHostNode')
            const inherited = {
                id: 'host.123',
                on: vi.fn(),
                error: vi.fn(),
            } as any
            const explicit = {
                id: 'host.456',
                on: vi.fn(),
                error: vi.fn(),
            } as any
            const factory = HostFactory(
                { nodes: { createNode: vi.fn() } },
                hostType
            )
            const config = switchServiceBridgeFlow().flow[1]
            factory.init.call(inherited, { ...config, logLevel: 'inherit' })
            factory.init.call(explicit, { ...config, logLevel: 'debug' })
            const identify = (node: any) =>
                node.host.emit('identify', false, vi.fn())
            const close = runtime.deploy('disabled')
            output.mockClear()
            identify(inherited)
            expect(output).not.toHaveBeenCalled()
            identify(explicit)
            expect(output.mock.calls.flat().join(' ')).toContain(
                'Identify called'
            )
            close()
            output.mockClear()
            identify(inherited)
            expect(output.mock.calls.flat().join(' ')).toContain(
                'Identify called'
            )
        }
    )

    it.each([
        ['debug', true, false],
        ['trace', true, true],
        ['error', false, false],
        ['disabled', false, false],
        ['inherit', true, true],
        [undefined, true, true],
    ])(
        'applies %s to core and API logging',
        async (level, debugEnabled, traceEnabled) => {
            loggerSetup({
                debugEnabled: true,
                traceEnabled: true,
                errorEnabled: true,
            })
            const output = vi
                .spyOn(debug, 'log')
                .mockImplementation(() => undefined)
            const runtime = createRuntime()
            output.mockClear()
            runtime.deploy(level)
            await runtime.initialization
            await vi.waitFor(() =>
                expect(runtime.routes.has('/nrchkb/config')).toBe(true)
            )
            await runtime.routes.get('/nrchkb/config')?.(
                {},
                {
                    setHeader: vi.fn(),
                    json: vi.fn(),
                }
            )
            const messages = output.mock.calls
                .map((args) => args.join(' '))
                .join('\n')
            expect(messages.includes('nrchkb storage path set')).toBe(
                debugEnabled
            )
            expect(messages.includes('Initialize NRCHKB Info API')).toBe(
                debugEnabled
            )
            expect(messages.includes('loadCustomCharacteristics()')).toBe(
                traceEnabled
            )
            expect(messages.includes('Refreshing Custom Characteristics')).toBe(
                debugEnabled
            )
            const { Storage } = require('../../../build/lib/Storage')
            vi.spyOn(
                Storage,
                'loadCustomCharacteristics'
            ).mockRejectedValueOnce(new Error('logging-probe'))
            output.mockClear()
            await runtime.routes.get('/nrchkb/config')?.(
                {},
                {
                    setHeader: vi.fn(),
                    json: vi.fn(),
                }
            )
            expect(
                output.mock.calls.flat().join(' ').includes('logging-probe')
            ).toBe(level !== 'disabled')
        }
    )

    it('restores the previous level when a deployed node closes', async () => {
        loggerSetup({ debugEnabled: false, traceEnabled: false })
        const output = vi
            .spyOn(debug, 'log')
            .mockImplementation(() => undefined)
        const runtime = createRuntime()
        const closeTrace = runtime.deploy('trace')
        const closeDisabled = runtime.deploy('disabled')
        await runtime.initialization
        const readConfig = () =>
            runtime.routes.get('/nrchkb/config')?.(
                {},
                {
                    setHeader: vi.fn(),
                    json: vi.fn(),
                }
            )
        output.mockClear()
        await readConfig()
        expect(output).not.toHaveBeenCalled()
        closeDisabled()
        output.mockClear()
        await readConfig()
        expect(output.mock.calls.flat().join(' ')).toContain(
            'loadCustomCharacteristics()'
        )
        closeTrace()
        output.mockClear()
        await readConfig()
        expect(output).not.toHaveBeenCalled()
    })

    it('places Log Level before the Custom Characteristics disclosure', () => {
        const html = readFileSync('build/nodes/nrchkb.html', 'utf8')
        const template = html.match(
            /<script data-template-name="nrchkb"[^>]*>([\s\S]*?)<\/script>/
        )?.[1]
        expect(template).toBeDefined()
        expect(
            template?.indexOf('id="node-input-logLevel-container"')
        ).toBeLessThan(template?.indexOf('<details') ?? -1)
    })
})
