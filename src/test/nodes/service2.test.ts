import {
    Accessory,
    Bridge,
    Characteristic,
    Service,
} from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import helper from 'node-red-node-test-helper'
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import { createAutomaticHomebridgeCameraFfmpegPluginEntry } from '../../plugins/embedded'
import { describeCommonSwitchServiceBehavior } from '../test-utils/common-switch-service-tests'
import { switchService2BridgeFlow } from '../test-utils/data'
import {
    configureNodeRedTestSettings,
    waitForInput,
} from '../test-utils/vitest-helper'

const homekitBridgeNode = require('../../../build/nodes/bridge')
const nrchkb = require('../../../build/nodes/nrchkb')
const pluginInstanceNode = require('../../../build/nodes/plugin-instance')
const homekitService2Node = require('../../../build/nodes/service2')
const { registerPlugin } = require('../../../build/plugins/registry')

const createFakePluginNode = (order: string[]) => (RED: any) => {
    function FakePluginNode(this: any, config: any) {
        RED.nodes.createNode(this, config)
        this.name = config.name
        this.attachNRCHKBPlugin = (context: any) => {
            order.push(this.name)
            return (
                context.accessory.getService(Service.Switch) ??
                context.accessory.addService(
                    Service.Switch,
                    context.serviceInformation.name
                )
            )
        }
    }

    RED.nodes.registerType('fake-nrchkb-plugin', FakePluginNode)
}

const waitForService = async (node: { service?: unknown }) => {
    const started = Date.now()

    while (!node.service) {
        if (Date.now() - started > 5000) {
            throw new Error('Timed out waiting for service setup')
        }

        await new Promise((resolve) => setTimeout(resolve, 25))
    }
}

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

vi.spyOn(Bridge.prototype, 'publish').mockImplementation(function () {
    return true as never
})
vi.spyOn(Bridge.prototype, 'unpublish').mockResolvedValue(undefined)
vi.spyOn(Accessory.prototype, 'publish').mockImplementation(function () {
    return true as never
})
vi.spyOn(Accessory.prototype, 'unpublish').mockResolvedValue(undefined)

describe('Service Node', () => {
    let cleanupUserDir: (() => void) | undefined

    beforeAll(async () => {
        cleanupUserDir = configureNodeRedTestSettings()
        await new Promise<void>((resolve) => helper.startServer(resolve))
    })

    afterAll(async () => {
        await new Promise<void>((resolve) => helper.stopServer(resolve))
        cleanupUserDir?.()
    })

    afterEach(() => {
        return helper.unload()
    })

    describeCommonSwitchServiceBehavior({
        buildFlow: switchService2BridgeFlow,
        expectedType: 'homekit-service2',
        nodes: [nrchkb, homekitBridgeNode, homekitService2Node],
        title: 'shared switch behavior',
    })

    it('should round-trip GET callbacks when useEventCallback is enabled', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].useEventCallback = true

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        const h1 = helper.getNode('h1')
        const onCharacteristic = s1.service.getCharacteristic(Characteristic.On)
        const getCallback = vi.fn()

        const firstMessage = waitForInput<Record<string, any>>(h1)

        onCharacteristic.emit('get', getCallback, undefined, undefined)

        const msg1 = await firstMessage
        const callbackID = msg1.hap.event.context.callbackID

        expect(callbackID).toEqual(expect.any(String))
        expect(getCallback).not.toHaveBeenCalled()

        const secondMessage = waitForInput<Record<string, any>>(h1)

        s1.receive({
            payload: {
                [callbackID]: true,
            },
        })

        const msg2 = await secondMessage

        expect(getCallback).toHaveBeenCalledWith(null, true)
        expect(msg2.payload).toMatchObject({ On: true })
        expect(msg2.hap).toMatchObject({
            event: {
                name: 'get',
                context: {
                    key: 'On',
                },
            },
            newValue: true,
        })
    })

    it('emits event-shaped messages by default', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        const h1 = helper.getNode('h1')
        const onCharacteristic = s1.service.getCharacteristic(Characteristic.On)
        const output = waitForInput<Record<string, any>>(h1)

        onCharacteristic.emit('set', true, vi.fn(), undefined, undefined)

        const msg = await output

        expect(msg.payload).toMatchObject({ On: true })
        expect(msg.hap).toMatchObject({
            event: {
                name: 'set',
                context: {
                    key: 'On',
                },
            },
            newValue: true,
        })
    })

    it('emits legacy onSet messages when outputMode is legacy', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].outputMode = 'legacy'
        flow[0].outputs = 2

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        const h1 = helper.getNode('h1')
        const onCharacteristic = s1.service.getCharacteristic(Characteristic.On)
        const output = waitForInput<Record<string, any>>(h1)

        onCharacteristic.emit('set', true, vi.fn(), undefined, undefined)

        const msg = await output

        expect(msg.payload).toMatchObject({ On: true })
        expect(msg.hap).not.toHaveProperty('event')
        expect(msg.hap).toMatchObject({
            newValue: true,
            reachable: true,
        })
    })

    it('loads migrated Camera service nodes with the embedded camera plugin', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].serviceName = 'Camera'
        flow[0].name = 'Migrated Camera'
        flow[0].outputMode = 'legacy'
        flow[0].outputs = 3
        flow[0].cameraConfigSource = '-f lavfi -i testsrc=s=320x240:r=15'
        flow[0].cameraConfigMaxWidth = 320
        flow[0].cameraConfigMaxHeight = 240
        flow[0].cameraConfigMaxFPS = 15
        flow[0].cameraConfigVideoFilter = 'scale=320:240'
        flow[0].plugins = [
            createAutomaticHomebridgeCameraFfmpegPluginEntry(
                flow[0] as unknown as Record<string, unknown>
            ),
        ]

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(s1.service.UUID).toBe('00000110-0000-1000-8000-0026BB765291')
        expect(s1.config.serviceName).toBe('Camera')
    })

    it('emits legacy onChange messages when outputMode is legacy', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].outputMode = 'legacy'
        flow[0].outputs = 2

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        const h1 = helper.getNode('h1')
        const onCharacteristic = s1.service.getCharacteristic(Characteristic.On)
        const output = waitForInput<Record<string, any>>(h1)

        onCharacteristic.emit('change', {
            oldValue: false,
            newValue: true,
            context: undefined,
            originator: undefined,
            reason: 'write',
        })

        const msg = await output

        expect(msg.payload).toMatchObject({ On: true })
        expect(msg.hap).not.toHaveProperty('event')
        expect(msg.hap).toMatchObject({
            oldValue: false,
            newValue: true,
            reachable: true,
        })
    })

    it('handles Camera service with undefined plugins', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].serviceName = 'Camera'
        flow[0].name = 'Camera with Undefined Plugins'
        flow[0].outputMode = 'legacy'
        flow[0].outputs = 3
        flow[0].cameraConfigSource = '-f lavfi -i testsrc=s=320x240:r=15'
        flow[0].cameraConfigMaxWidth = 320
        flow[0].cameraConfigMaxHeight = 240
        flow[0].cameraConfigMaxFPS = 15
        flow[0].cameraConfigVideoFilter = 'scale=320:240'
        // plugins is intentionally undefined
        flow[0].plugins = undefined

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(s1.service.UUID).toBe('00000110-0000-1000-8000-0026BB765291')
        expect(s1.config.serviceName).toBe('Camera')
    })

    it('handles Camera service with empty plugins array', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].serviceName = 'Camera'
        flow[0].name = 'Camera with Empty Plugins'
        flow[0].outputMode = 'legacy'
        flow[0].outputs = 3
        flow[0].cameraConfigSource = '-f lavfi -i testsrc=s=320x240:r=15'
        flow[0].cameraConfigMaxWidth = 320
        flow[0].cameraConfigMaxHeight = 240
        flow[0].cameraConfigMaxFPS = 15
        flow[0].cameraConfigVideoFilter = 'scale=320:240'
        // plugins is explicitly empty
        flow[0].plugins = []

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(s1.service.UUID).toBe('00000110-0000-1000-8000-0026BB765291')
        expect(s1.config.serviceName).toBe('Camera')
    })

    it('attaches config-node plugins from service2 plugin slots', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        const order: string[] = []
        flow[0].plugin1 = 'plugin-config-1'
        flow.push({
            id: 'plugin-config-1',
            type: 'fake-nrchkb-plugin',
            name: 'Fake Plugin 1',
        } as never)

        await helper.load(
            [
                nrchkb,
                homekitBridgeNode,
                homekitService2Node,
                createFakePluginNode(order),
            ],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(order).toEqual(['Fake Plugin 1'])
        expect(s1.service.UUID).toBe(Service.Switch.UUID)
    })

    it('passes mirrored UniFi controller references from plugin instances into plugin config', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        const seenConfigs: Array<Record<string, unknown>> = []
        const pluginId = 'test-package:config-node-camera'

        registerPlugin(
            {
                id: pluginId,
                packageName: 'test-package',
                pluginName: 'config-node-camera',
                displayName: 'Config Node Camera',
                author: 'NRCHKB',
                version: '1.0.0',
                description: 'Test plugin.',
                attachment: 'config-node',
                capabilities: {
                    camera: true,
                },
            },
            {
                attach: (context) => {
                    seenConfigs.push(context.config as Record<string, unknown>)
                    return (
                        context.accessory.getService(Service.Switch) ??
                        context.accessory.addService(
                            Service.Switch,
                            context.serviceInformation.name
                        )
                    )
                },
            }
        )

        flow[0].plugin1 = 'plugin-instance-1'
        flow.push({
            id: 'plugin-instance-1',
            type: 'homekit-plugin-instance',
            name: 'UniFi Camera Plugin',
            pluginId,
            pluginConfig: JSON.stringify({ camera: 'camera-1' }),
            controller: 'unifi-controller-1',
        } as never)

        await helper.load(
            [
                nrchkb,
                homekitBridgeNode,
                homekitService2Node,
                pluginInstanceNode,
            ],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(seenConfigs).toEqual([
            {
                camera: 'camera-1',
                controller: 'unifi-controller-1',
            },
        ])
    })

    it('ignores malformed serialized plugin entries during service startup', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].plugins = '{not-json'

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(s1.service.UUID).toBe(Service.Switch.UUID)
    })

    it('ignores malformed plugin entry objects during service startup', async () => {
        const { serviceId, flow } = switchService2BridgeFlow()
        flow[0].plugins = JSON.stringify([{ config: { enabled: true } }])

        await helper.load(
            [nrchkb, homekitBridgeNode, homekitService2Node],
            flow
        )

        const s1 = helper.getNode(serviceId)
        await waitForService(s1)

        expect(s1.service.UUID).toBe(Service.Switch.UUID)
    })
})
