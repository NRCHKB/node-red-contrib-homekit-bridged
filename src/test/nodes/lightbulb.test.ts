import {
    Accessory,
    ChangeReason,
    Characteristic,
    Formats,
    Perms,
} from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import type HAPHostNodeType from '../../lib/types/HAPHostNodeType'
import type HAPServiceNodeType from '../../lib/types/HAPServiceNodeType'
import { loadBuildNodes } from '../test-utils/build-node-loader'
import {
    configureNodeRedTestSettings,
    helper,
    loadNodeRedFlow,
    type TestFlowNode,
    unloadNodeRedFlow,
    waitForInput,
} from '../test-utils/vitest-helper'

const {
    bridge: homekitBridgeNode,
    nrchkb,
    service: homekitServiceNode,
    service2: homekitService2Node,
} = loadBuildNodes()

const homekitStandaloneNode = require('../../../build/nodes/standalone')

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

const buildLightbulbFlow = (type = 'homekit-service') => {
    const serviceId = `lightbulb.${Date.now()}`
    const bridgeId = `bridge.${Date.now()}`
    const flowId = `flow.${Date.now()}`

    return {
        flow: [
            {
                accessoryId: '',
                type,
                bridge: bridgeId,
                cameraConfigAdditionalCommandLine: '',
                cameraConfigAudio: false,
                cameraConfigAudioCodec: 'libfdk_aac',
                cameraConfigDebug: false,
                cameraConfigHorizontalFlip: false,
                cameraConfigInterfaceName: '',
                cameraConfigMapAudio: '0:1',
                cameraConfigMapVideo: '0:0',
                cameraConfigMaxBitrate: 300,
                cameraConfigMaxFPS: 10,
                cameraConfigMaxHeight: 720,
                cameraConfigMaxStreams: 2,
                cameraConfigMaxWidth: 1280,
                cameraConfigPacketSize: 1316,
                cameraConfigSnapshotOutput: 'disabled',
                cameraConfigSource: '',
                cameraConfigStillImageSource: '',
                cameraConfigVideoCodec: 'libx264',
                cameraConfigVideoFilter: 'scale=1280:720',
                cameraConfigVideoProcessor: 'ffmpeg',
                cameraConfigVerticalFlip: false,
                characteristicProperties: JSON.stringify({
                    Brightness: {
                        format: Formats.UINT8,
                        maxValue: 100,
                        minStep: 1,
                        minValue: 0,
                        perms: [
                            Perms.PAIRED_READ,
                            Perms.PAIRED_WRITE,
                            Perms.NOTIFY,
                        ],
                    },
                    ColorTemperature: {
                        format: Formats.UINT16,
                        maxValue: 500,
                        minValue: 140,
                        perms: [
                            Perms.PAIRED_READ,
                            Perms.PAIRED_WRITE,
                            Perms.NOTIFY,
                        ],
                    },
                }),
                filter: false,
                firmwareRev: '1.0.0',
                hardwareRev: '1.0.0',
                hostType: '0',
                id: serviceId,
                isParent: true,
                manufacturer: 'NRCHKB',
                model: '1.0.0',
                name: 'Adaptive Light',
                outputs: 2,
                parentService: '',
                serviceName: 'Lightbulb',
                serialNo: 'Adaptive-Lightbulb',
                softwareRev: '1.0.0',
                topic: '',
                waitForSetupMsg: false,
                wires: [['helper-output'], ['helper-output']],
                x: 320,
                y: 180,
                z: flowId,
                adaptiveLightingOptionsEnable: true,
                adaptiveLightingOptionsMode: 1,
            },
            {
                bridgeName: 'Bridge',
                customMdnsConfig: false,
                firmwareRev: '1.0.0',
                hardwareRev: '1.0.0',
                id: bridgeId,
                allowInsecureRequest: false,
                allowMessagePassthrough: true,
                mdnsInterface: '',
                mdnsIp: '',
                mdnsLoopback: true,
                mdnsMulticast: true,
                mdnsPort: '',
                mdnsReuseAddr: true,
                mdnsTtl: '',
                manufacturer: 'NRCHKB',
                model: '1.0.0',
                pinCode: '1111-1111',
                port: '',
                serialNo: 'Adaptive-Lightbulb',
                softwareRev: '1.0.0',
                type: 'homekit-bridge',
            },
            { id: 'helper-output', type: 'helper' },
        ],
        bridgeId,
        serviceId,
    }
}

describe('Lightbulb Service', () => {
    let cleanupUserDir: (() => void) | undefined

    beforeAll(async () => {
        cleanupUserDir = configureNodeRedTestSettings()
    })

    afterAll(async () => {
        cleanupUserDir?.()
    })

    afterEach(async () => {
        await unloadNodeRedFlow()
        vi.restoreAllMocks()
    })

    it('routes Brightness values and preserves msg.hap.context', async () => {
        const { flow, serviceId } = buildLightbulbFlow()

        await loadNodeRedFlow(
            [nrchkb, homekitBridgeNode, homekitServiceNode],
            flow
        )

        const node = helper.getNode(serviceId) as HAPServiceNodeType
        const helperOutput = helper.getNode('helper-output')
        const context = { traceId: 'brightness-75' }

        const message = waitForInput<Record<string, any>>(helperOutput)
        node.receive({
            payload: {
                Brightness: 75,
                Context: context,
            },
        })

        const msg = await message
        expect(msg.payload).toMatchObject({
            Brightness: 75,
        })
        expect(msg.hap.context).toEqual(context)
        expect(msg.hap.newValue).toBe(75)
    })

    it('initializes adaptive lighting and stays stable after a color temperature update', async () => {
        const { flow, serviceId } = buildLightbulbFlow()

        await loadNodeRedFlow(
            [nrchkb, homekitBridgeNode, homekitServiceNode],
            flow
        )

        const node = helper.getNode(serviceId) as HAPServiceNodeType
        const colorTemperature = node.service.getCharacteristic(
            Characteristic.ColorTemperature
        )

        expect(node.adaptiveLightingController).toBeDefined()
        expect(node.hostNode.adaptiveLightingControllers.get(serviceId)).toBe(
            node.adaptiveLightingController
        )

        const helperOutput = helper.getNode('helper-output')
        const message = waitForInput<Record<string, any>>(helperOutput)

        colorTemperature.emit('change', {
            context: { source: 'homekit' },
            newValue: 350,
            oldValue: 300,
            originator: undefined,
            reason: ChangeReason.WRITE,
        })

        const msg = await message
        expect(msg.payload).toMatchObject({
            ColorTemperature: 350,
        })
        expect(msg.hap.context).toEqual({ source: 'homekit' })
        expect(node.adaptiveLightingController).toBeDefined()
    })

    it.each([
        ['homekit-service', homekitServiceNode],
        ['homekit-service2', homekitService2Node],
    ])(
        'drops the Adaptive Lighting controller of a %s light deleted while its bridge keeps running',
        async (type, serviceNode) => {
            const { bridgeId, flow, serviceId } = buildLightbulbFlow(type)

            await loadNodeRedFlow(
                [nrchkb, homekitBridgeNode, serviceNode],
                flow
            )

            const bridge = helper.getNode(bridgeId) as HAPHostNodeType
            // homekit-service2 sets up its service asynchronously
            await vi.waitFor(() =>
                expect(bridge.adaptiveLightingControllers.size).toBe(1)
            )
            const { service } = helper.getNode(serviceId) as HAPServiceNodeType

            // a modified-nodes deploy stops only the deleted light
            await helper.setFlows(
                flow.filter((node) => node.id !== serviceId),
                'nodes'
            )

            expect(helper.getNode(bridgeId)).toBe(bridge)
            expect(bridge.adaptiveLightingControllers.size).toBe(0)
            // removed from the accessory as well, which also stops its transition
            expect(
                service.testCharacteristic(
                    Characteristic.CharacteristicValueTransitionControl
                )
            ).toBe(false)
        }
    )

    it.each(
        [
            {
                type: 'homekit-service',
                serviceNode: homekitServiceNode,
                standalone: false,
            },
            {
                type: 'homekit-service2',
                serviceNode: homekitService2Node,
                standalone: false,
            },
            {
                type: 'homekit-service',
                serviceNode: homekitServiceNode,
                standalone: true,
            },
            {
                type: 'homekit-service2',
                serviceNode: homekitService2Node,
                standalone: true,
            },
        ].flatMap((scenario) => [
            { ...scenario, linked: false },
            { ...scenario, linked: true },
        ])
    )(
        'replaces the Adaptive Lighting controller when $type changes type (standalone: $standalone, linked: $linked)',
        async ({ type, serviceNode, standalone, linked }) => {
            vi.spyOn(Accessory.prototype, 'publish').mockResolvedValue()
            const { bridgeId, flow, serviceId } = buildLightbulbFlow(type)
            let configuredFlow: TestFlowNode[] = flow.map((node) => {
                if (standalone && node.id === bridgeId) {
                    return { ...node, type: 'homekit-standalone' }
                }
                if (standalone && node.id === serviceId) {
                    return { ...node, hostType: '1', accessoryId: bridgeId }
                }
                return node
            })
            if (linked) {
                const parentId = `parent.${serviceId}`
                const parent = {
                    ...configuredFlow.find((node) => node.id === serviceId),
                    id: parentId,
                    type,
                    name: 'Parent Switch',
                    serviceName: 'Switch',
                    characteristicProperties: '{}',
                    adaptiveLightingOptionsEnable: false,
                }
                configuredFlow = configuredFlow.map((node) =>
                    node.id === serviceId
                        ? { ...node, isParent: false, parentService: parentId }
                        : node
                )
                configuredFlow.unshift(parent)
            }

            await loadNodeRedFlow(
                [nrchkb, homekitBridgeNode, homekitStandaloneNode, serviceNode],
                configuredFlow
            )

            const host = helper.getNode(bridgeId) as HAPHostNodeType
            await vi.waitFor(
                () => expect(host.adaptiveLightingControllers.size).toBe(1),
                { timeout: 3000 }
            )
            const original = helper.getNode(serviceId) as HAPServiceNodeType
            const originalController =
                host.adaptiveLightingControllers.get(serviceId)!
            const transitionStartMillis = Date.now() - 1000
            originalController.deserialize({
                activeTransition: {
                    iid: 14,
                    brightnessCharacteristicIID: 13,
                    transitionStartMillis,
                    timeMillisOffset: 0,
                    transitionId: 'c4f33da9-63c9-4c0f-8b89-6c36a33eef9e',
                    transitionStartBuffer: '10c979d0bd000000',
                    id3: 'ec883b3f08d54f89',
                    brightnessAdjustmentRange: {
                        minBrightnessValue: 10,
                        maxBrightnessValue: 100,
                    },
                    transitionCurve: [
                        {
                            temperature: 300,
                            brightnessAdjustmentFactor: 0,
                            transitionTime: 0,
                        },
                        {
                            temperature: 350,
                            brightnessAdjustmentFactor: 0,
                            transitionTime: 86400000,
                        },
                    ],
                    updateInterval: 60000,
                    notifyIntervalThreshold: 600000,
                },
            })
            expect(originalController.isAdaptiveLightingActive()).toBe(true)

            // Editing a normal property must preserve the live controller and curve.
            await helper.setFlows(
                configuredFlow.map((node) =>
                    node.id === serviceId
                        ? { ...node, topic: 'modified' }
                        : node
                ),
                'nodes'
            )
            await vi.waitFor(() => {
                const modified = helper.getNode(serviceId) as HAPServiceNodeType
                expect(modified.configured).toBe(true)
                expect(modified.service).toBe(original.service)
                expect(host.adaptiveLightingControllers.get(serviceId)).toBe(
                    originalController
                )
                expect(originalController.isAdaptiveLightingActive()).toBe(true)
                expect(
                    originalController.getAdaptiveLightingStartTimeOfTransition()
                ).toBe(transitionStartMillis)
            })

            await helper.setFlows(
                configuredFlow.map((node) =>
                    node.id === serviceId
                        ? {
                              ...node,
                              serviceName: 'Switch',
                              characteristicProperties: '{}',
                          }
                        : node
                ),
                'nodes'
            )

            await vi.waitFor(() => {
                const changed = helper.getNode(serviceId) as HAPServiceNodeType
                expect(changed.service.UUID).not.toBe(original.service.UUID)
                expect(host.adaptiveLightingControllers.size).toBe(0)
                expect(originalController.isAdaptiveLightingActive()).toBe(
                    false
                )
                expect(
                    original.service.testCharacteristic(
                        Characteristic.CharacteristicValueTransitionControl
                    )
                ).toBe(false)
            })

            await helper.setFlows(configuredFlow, 'nodes')

            await vi.waitFor(() => {
                const restored = helper.getNode(serviceId) as HAPServiceNodeType
                expect(restored.service).not.toBe(original.service)
                expect(
                    restored.service.testCharacteristic(
                        Characteristic.CharacteristicValueTransitionControl
                    )
                ).toBe(true)
                expect(host.adaptiveLightingControllers.size).toBe(1)
                expect(host.adaptiveLightingControllers.get(serviceId)).toBe(
                    restored.adaptiveLightingController
                )
                expect(restored.adaptiveLightingController).not.toBe(
                    originalController
                )
            })
            expect(helper.getNode(bridgeId)).toBe(host)
        }
    )

    it('drops the Adaptive Lighting controller of a light modified and then deleted while its bridge keeps running', async () => {
        const { bridgeId, flow, serviceId } = buildLightbulbFlow()

        await loadNodeRedFlow(
            [nrchkb, homekitBridgeNode, homekitServiceNode],
            flow
        )

        const bridge = helper.getNode(bridgeId) as HAPHostNodeType
        const original = helper.getNode(serviceId) as HAPServiceNodeType
        const controller = original.adaptiveLightingController

        // The modified light reuses the accessory, which keeps the controller of
        // the original node, so that controller stays tracked for the node id.
        await helper.setFlows(
            flow.map((node) =>
                node.id === serviceId ? { ...node, topic: 'modified' } : node
            ),
            'nodes'
        )
        const modified = helper.getNode(serviceId) as HAPServiceNodeType
        expect(modified).not.toBe(original)
        expect(helper.getNode(bridgeId)).toBe(bridge)
        expect([...bridge.adaptiveLightingControllers.values()]).toEqual([
            controller,
        ])

        await helper.setFlows(
            flow.filter((node) => node.id !== serviceId),
            'nodes'
        )

        expect(bridge.adaptiveLightingControllers.size).toBe(0)
        expect(
            modified.service.testCharacteristic(
                Characteristic.CharacteristicValueTransitionControl
            )
        ).toBe(false)
    })
})
