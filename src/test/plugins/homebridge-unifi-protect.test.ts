import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    createHomebridgeUniFiProtectCleanup,
    ensureHomebridgePlatformAccessoryShape,
    HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID,
    registerEmbeddedPlugins,
} from '../../plugins/embedded'
import { clearPluginsForTest, getPlugin } from '../../plugins/registry'

describe('Homebridge UniFi Protect embedded plugin', () => {
    afterEach(() => {
        clearPluginsForTest()
    })

    it('registers NRCHKB-owned metadata with upstream attribution', () => {
        registerEmbeddedPlugins()

        const plugin = getPlugin(HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID)

        expect(plugin?.metadata).toMatchObject({
            id: 'node-red-contrib-homekit-bridged:homebridge-unifi-protect',
            packageName: 'node-red-contrib-homekit-bridged',
            pluginName: 'homebridge-unifi-protect',
            displayName: 'Homebridge UniFi Protect',
            author: 'NRCHKB',
            prerequisites: {
                serviceNames: ['Camera'],
            },
            multipleInstances: false,
            upstream: expect.objectContaining({
                packageName: 'homebridge-unifi-protect',
                projectName: 'Homebridge UniFi Protect',
                license: 'ISC',
            }),
        })
    })

    it('exposes controller and discovered-camera editor fields', () => {
        registerEmbeddedPlugins()

        const plugin = getPlugin(HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID)
        const fields =
            plugin?.metadata.editor?.sections.flatMap(
                (section) => section.fields
            ) ?? []

        expect(fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: 'controller',
                    type: 'config-node',
                    configNodeType: 'homekit-unifi-controller',
                }),
                expect.objectContaining({
                    path: 'camera',
                    type: 'dynamic-select',
                    optionsDependsOn: 'controller',
                }),
                expect.objectContaining({
                    path: 'twoWayAudio',
                    type: 'checkbox',
                    default: true,
                }),
                expect.objectContaining({
                    path: 'featureOptions',
                    type: 'textarea',
                }),
            ])
        )
    })

    it('marks NRCHKB accessories with the Homebridge bridged shape expected by HBUP', () => {
        const accessory = {}

        ensureHomebridgePlatformAccessoryShape(accessory, true)

        expect(accessory).toMatchObject({
            _associatedHAPAccessory: {
                bridged: true,
            },
        })
    })

    it('cleans up UniFi Protect controllers once and tolerates partial cleanup failures', () => {
        const emit = vi.fn()
        const cleanupFailure = vi.fn(() => {
            throw new Error('cleanup failed')
        })
        const cleanupSuccess = vi.fn()
        const disconnect = vi.fn(() => {
            throw new Error('disconnect failed')
        })
        const logout = vi.fn()
        const cleanup = createHomebridgeUniFiProtectCleanup(
            {
                controllers: [
                    {
                        configuredDevices: new Map([
                            ['camera-1', { cleanup: cleanupFailure }],
                            ['camera-2', { cleanup: cleanupSuccess }],
                        ]),
                        disconnect,
                        ufpApi: { logout },
                    },
                ],
            } as never,
            emit
        )

        expect(() => cleanup()).not.toThrow()
        cleanup()

        expect(emit).toHaveBeenCalledTimes(1)
        expect(cleanupFailure).toHaveBeenCalledTimes(1)
        expect(cleanupSuccess).toHaveBeenCalledTimes(1)
        expect(disconnect).toHaveBeenCalledTimes(1)
        expect(logout).toHaveBeenCalledTimes(1)
    })
})
