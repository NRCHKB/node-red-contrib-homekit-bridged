import { loggerSetup } from '@nrchkb/logger'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { version } from '../../../package.json'
import EveCharacteristics from '../../lib/hap/eve-app/EveCharacteristics'
import {
    accessoryCategoriesResponse,
    serviceTypesResponse,
} from '../test-utils/data'

const APIFactory = require('../../../build/lib/api')
const API = APIFactory()
const buildStorage = require('../../../build/lib/Storage')

process.env.NRCHKB_EXPERIMENTAL = 'true'

type RouteHandler = (
    _req: unknown,
    res: {
        body?: unknown
        headers: Record<string, string>
        json: (body: unknown) => void
        sendStatus: (status: number) => void
        setHeader: (key: string, value: string) => void
        status: (status: number) => {
            json: (body: unknown) => void
        }
        statusCode?: number
    }
) => void | Promise<void>

type RouteHarness = {
    RED: {
        auth: {
            needsPermission: () => (
                _req: unknown,
                _res: unknown,
                next: () => void
            ) => void
        }
        httpAdmin: {
            get: (
                route: string,
                _permission: unknown,
                handler: RouteHandler
            ) => void
            post: (
                route: string,
                _permission: unknown,
                handler: RouteHandler
            ) => void
        }
        nodes: {
            eachNode: () => undefined
            getNode: (id: string) => unknown
        }
    }
    routes: {
        get: Map<string, RouteHandler>
        post: Map<string, RouteHandler>
    }
}

const createResponse = () => {
    const response: {
        body?: unknown
        headers: Record<string, string>
        json: (body: unknown) => void
        sendStatus: (status: number) => void
        setHeader: (key: string, value: string) => void
        status: (status: number) => {
            json: (body: unknown) => void
        }
        statusCode?: number
    } = {
        headers: {},
        json(body: unknown) {
            response.body = body
        },
        sendStatus(status: number) {
            response.statusCode = status
        },
        setHeader(key: string, value: string) {
            response.headers[key] = value
        },
        status(status: number) {
            response.statusCode = status
            return {
                json(body: unknown) {
                    response.body = body
                },
            }
        },
    }

    return response
}

const createRouteHarness = (
    nodesById: Record<string, unknown> = {}
): RouteHarness => {
    const routes = {
        get: new Map<string, RouteHandler>(),
        post: new Map<string, RouteHandler>(),
    }

    return {
        RED: {
            auth: {
                needsPermission:
                    () => (_req: unknown, _res: unknown, next: () => void) =>
                        next(),
            },
            httpAdmin: {
                get: (
                    route: string,
                    _permission: unknown,
                    handler: RouteHandler
                ) => {
                    routes.get.set(route, handler)
                },
                post: (
                    route: string,
                    _permission: unknown,
                    handler: RouteHandler
                ) => {
                    routes.post.set(route, handler)
                },
            },
            nodes: {
                eachNode: () => undefined,
                getNode: (id: string) => nodesById[id],
            },
        },
        routes,
    }
}

const invokeRoute = async (route: RouteHandler | undefined, req: unknown) => {
    expect(route).toBeDefined()
    const response = createResponse()
    await route?.(req, response)
    return response
}

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

describe('api', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('registers service, info, advertiser, accessory, and custom-characteristics routes', async () => {
        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const serviceResponse = await invokeRoute(
            routes.get.get('/nrchkb/service/types'),
            {}
        )

        expect(serviceResponse.headers['Content-Type']).toBe('application/json')
        expect(serviceResponse.body).toHaveProperty('Switch')
        expect(
            (serviceResponse.body as Record<string, unknown>).Switch
        ).toMatchObject({ displayName: 'Switch' })
        expect(
            (serviceResponse.body as Record<string, unknown>).CameraControl
        ).toMatchObject({ nrchkbHiddenInService2: true })

        const infoResponse = await invokeRoute(
            routes.get.get('/nrchkb/info'),
            {}
        )
        expect(infoResponse.body).toEqual({
            experimental: true,
            version: api.stringifyVersion(version),
        })

        const advertiserResponse = await invokeRoute(
            routes.get.get('/nrchkb/advertiser/recommendation'),
            {}
        )
        expect(advertiserResponse.headers['Content-Type']).toBe(
            'application/json'
        )
        expect(advertiserResponse.body).toMatchObject({
            detected: expect.objectContaining({
                platform: expect.any(String),
            }),
            reason: expect.any(String),
            recommended: expect.any(String),
            title: expect.any(String),
        })

        expect(routes.get.get('/nrchkb/bridge/:id/pairing')).toBeDefined()

        const accessoryResponse = await invokeRoute(
            routes.get.get('/nrchkb/accessory/categories'),
            {}
        )
        expect(accessoryResponse.body).toEqual(accessoryCategoriesResponse)

        const customConfigGet = await invokeRoute(
            routes.get.get('/nrchkb/config'),
            {}
        )
        expect(customConfigGet.body).toHaveProperty('customCharacteristics')
    })

    it('migrates one node through the migration API', async () => {
        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(
            routes.post.get('/nrchkb/migration/node'),
            {
                body: {
                    id: 'camera-1',
                    type: 'homekit-service',
                    serviceName: 'CameraControl',
                    name: 'Front Camera',
                    cameraConfigSource: '-re -i rtsp://camera/live',
                    wires: [['change'], ['set'], ['snapshot']],
                },
            }
        )

        expect(response.body).toMatchObject({
            migrated: true,
            cameraMigrated: true,
            node: {
                id: 'camera-1',
                type: 'homekit-service2',
                serviceName: 'Camera',
                outputMode: 'legacy',
                useEventCallback: false,
                outputs: 3,
                plugins: [
                    {
                        id: 'node-red-contrib-homekit-bridged:homebridge-camera-ffmpeg',
                        automatic: true,
                    },
                ],
                wires: [['change'], ['set'], ['snapshot']],
            },
        })
    })

    it('migrates a flow through the migration API', async () => {
        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(
            routes.post.get('/nrchkb/migration/flow'),
            {
                body: [
                    {
                        id: 'service-1',
                        type: 'homekit-service',
                        serviceName: 'Switch',
                    },
                    {
                        id: 'debug-1',
                        type: 'debug',
                    },
                ],
            }
        )

        expect(response.body).toMatchObject({
            migrated: 1,
            cameraMigrated: 0,
            skipped: 1,
            nodes: [
                {
                    id: 'service-1',
                    type: 'homekit-service2',
                    outputMode: 'legacy',
                    useEventCallback: false,
                    outputs: 2,
                },
                {
                    id: 'debug-1',
                    type: 'debug',
                },
            ],
        })
    })

    it('Service API', async () => {
        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(
            routes.get.get('/nrchkb/service/types'),
            {}
        )
        expect(response.body).toMatchObject(serviceTypesResponse)
    })

    describe('stringifyVersion', () => {
        it('release', () => {
            const input = '1.2.3'
            const expected = '1.2.3'
            const result = API.stringifyVersion(input)
            expect(result).toBe(expected)
        })

        it('dev', () => {
            const input = '1.2.3-dev.45'
            const expected = '0.123.45'
            const result = API.stringifyVersion(input)
            expect(result).toBe(expected)
        })
    })

    it('NRCHKB Info API', async () => {
        const { RED, routes } = createRouteHarness()
        const api = APIFactory(RED as never)
        api.init()
        const xyzVersion = API.stringifyVersion(version)

        const response = await invokeRoute(routes.get.get('/nrchkb/info'), {})

        expect(response.body).toStrictEqual({
            experimental: true,
            version: xyzVersion,
        })
    })

    describe('Bridge Pairing API', () => {
        const routeRequest = (id: string) => ({
            params: { id },
        })

        const createBridgeNode = (
            overrides: Partial<Record<string, unknown>> = {}
        ) => ({
            config: {
                bridgeName: 'Example Bridge',
                pinCode: '1234-5678',
            },
            host: {
                _accessoryInfo: {
                    paired: vi.fn(() => false),
                },
                setupURI: vi.fn(() => 'X-HM://123456789ABCD'),
            },
            paired: false,
            published: true,
            type: 'homekit-bridge',
            ...overrides,
        })

        it('returns QR data for an unpaired published bridge', async () => {
            const bridge = createBridgeNode()
            const { RED, routes } = createRouteHarness({
                bridge1: bridge,
            })
            const api = APIFactory(RED as never)
            api.init()

            const response = await invokeRoute(
                routes.get.get('/nrchkb/bridge/:id/pairing'),
                routeRequest('bridge1')
            )

            expect(response.statusCode).toBeUndefined()
            expect(response.body).toMatchObject({
                bridgeName: 'Example Bridge',
                formattedPinCode: {
                    bottom: '5678',
                    top: '1234',
                },
                paired: false,
                pinCode: '1234-5678',
                published: true,
                setupUri: 'X-HM://123456789ABCD',
                status: 'unpaired',
            })
            expect(
                (response.body as { qrCodeDataUrl: string }).qrCodeDataUrl
            ).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
        })

        it('returns QR data for an unpaired published standalone accessory', async () => {
            const accessory = createBridgeNode({
                config: {
                    bridgeName: 'Standalone Accessory',
                    pinCode: '8413-1633',
                },
                type: 'homekit-standalone',
            })
            const { RED, routes } = createRouteHarness({
                accessory1: accessory,
            })
            const api = APIFactory(RED as never)
            api.init()

            const response = await invokeRoute(
                routes.get.get('/nrchkb/bridge/:id/pairing'),
                routeRequest('accessory1')
            )

            expect(response.statusCode).toBeUndefined()
            expect(response.body).toMatchObject({
                bridgeName: 'Standalone Accessory',
                formattedPinCode: {
                    bottom: '1633',
                    top: '8413',
                },
                paired: false,
                pinCode: '8413-1633',
                published: true,
                setupUri: 'X-HM://123456789ABCD',
                status: 'unpaired',
            })
            expect(
                (response.body as { qrCodeDataUrl: string }).qrCodeDataUrl
            ).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
        })

        it('suppresses QR data for a paired bridge', async () => {
            const setupURI = vi.fn(() => 'X-HM://123456789ABCD')
            const bridge = createBridgeNode({
                host: {
                    _accessoryInfo: {
                        paired: vi.fn(() => true),
                    },
                    setupURI,
                },
            })
            const { RED, routes } = createRouteHarness({
                bridge1: bridge,
            })
            const api = APIFactory(RED as never)
            api.init()

            const response = await invokeRoute(
                routes.get.get('/nrchkb/bridge/:id/pairing'),
                routeRequest('bridge1')
            )

            expect(response.body).toMatchObject({
                paired: true,
                published: true,
                status: 'paired',
            })
            expect(response.body).not.toHaveProperty('qrCodeDataUrl')
            expect(setupURI).not.toHaveBeenCalled()
        })

        it('returns deploy-first state for an unpublished bridge', async () => {
            const bridge = createBridgeNode({
                published: false,
            })
            const { RED, routes } = createRouteHarness({
                bridge1: bridge,
            })
            const api = APIFactory(RED as never)
            api.init()

            const response = await invokeRoute(
                routes.get.get('/nrchkb/bridge/:id/pairing'),
                routeRequest('bridge1')
            )

            expect(response.statusCode).toBe(409)
            expect(response.body).toMatchObject({
                paired: false,
                published: false,
                status: 'unpublished',
            })
        })

        it('returns 404 for a missing bridge', async () => {
            const { RED, routes } = createRouteHarness()
            const api = APIFactory(RED as never)
            api.init()

            const response = await invokeRoute(
                routes.get.get('/nrchkb/bridge/:id/pairing'),
                routeRequest('missing')
            )

            expect(response.statusCode).toBe(404)
            expect(response.body).toMatchObject({
                error: 'Pairing host not found.',
                paired: false,
                published: false,
            })
        })
    })

    it('Advertiser Recommendation API', async () => {
        const { RED, routes } = createRouteHarness()
        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(
            routes.get.get('/nrchkb/advertiser/recommendation'),
            {}
        )

        expect(response.body).toMatchObject({
            caveats: expect.any(Array),
            detected: expect.objectContaining({
                avahiAvailable: expect.any(Boolean),
                container: expect.any(Boolean),
                dbusAvailable: expect.any(Boolean),
                platform: expect.any(String),
                resolvedAvailable: expect.any(Boolean),
            }),
            reason: expect.any(String),
            recommended: expect.stringMatching(
                /^(avahi|ciao|resolved|bonjour-hap)$/
            ),
            title: expect.any(String),
        })
    })

    it('Accessory API', async () => {
        const { RED, routes } = createRouteHarness()
        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(
            routes.get.get('/nrchkb/accessory/categories'),
            {}
        )

        expect(response.body).toStrictEqual(accessoryCategoriesResponse)
    })

    it('falls back to bundled custom characteristics when storage returns a non-array', async () => {
        vi.spyOn(
            buildStorage.Storage,
            'loadCustomCharacteristics'
        ).mockResolvedValueOnce({
            invalid: true,
        } as never)

        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(routes.get.get('/nrchkb/config'), {})

        expect(response.body.customCharacteristics).toStrictEqual(
            EveCharacteristics
        )
    })

    it('falls back to bundled custom characteristics when storage throws', async () => {
        vi.spyOn(
            buildStorage.Storage,
            'loadCustomCharacteristics'
        ).mockRejectedValueOnce(new Error('boom'))

        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = await invokeRoute(routes.get.get('/nrchkb/config'), {})

        expect(response.body.customCharacteristics).toStrictEqual(
            EveCharacteristics
        )
    })

    it('saves custom characteristics through the POST config route', async () => {
        const saveSpy = vi
            .spyOn(buildStorage.Storage, 'saveCustomCharacteristics')
            .mockResolvedValueOnce(undefined as never)

        const { RED, routes } = createRouteHarness()

        const api = APIFactory(RED as never)
        api.init()

        const response = createResponse()
        const postRoute = routes.post.get('/nrchkb/config')
        expect(postRoute).toBeDefined()
        await postRoute?.(
            {
                body: {
                    customCharacteristics: EveCharacteristics,
                },
            },
            response
        )

        await Promise.resolve()

        expect(saveSpy).toHaveBeenCalledWith(EveCharacteristics)
        expect(response.statusCode).toBe(200)
    })
})
