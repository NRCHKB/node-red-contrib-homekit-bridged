import { Characteristic } from '@homebridge/hap-nodejs'
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
import APIFactory from '../../lib/api'
import { Formats, Perms } from '../../lib/hap/hap-nodejs'
import { Storage } from '../../lib/Storage'
import { loadBuildNodes } from '../test-utils/build-node-loader'
import {
    configureNodeRedTestSettings,
    helper,
    loadNodeRedFlow,
    unloadNodeRedFlow,
    waitForInput,
} from '../test-utils/vitest-helper'

const {
    bridge: homekitBridgeNode,
    nrchkb,
    service: homekitServiceNode,
} = loadBuildNodes()

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

const buildCustomCharacteristicFlow = () => {
    const serviceId = `custom.${Date.now()}`
    const bridgeId = `bridge.${Date.now()}`
    const flowId = `flow.${Date.now()}`

    return {
        flow: [
            {
                accessoryId: '',
                type: 'homekit-service',
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
                    EveVolt: {
                        format: Formats.FLOAT,
                        maxValue: 240,
                        minStep: 0.1,
                        minValue: 0,
                        perms: [
                            Perms.PAIRED_READ,
                            Perms.PAIRED_WRITE,
                            Perms.NOTIFY,
                        ],
                    },
                    TotalEnergyUsage: {
                        format: Formats.FLOAT,
                        maxValue: 999999,
                        minStep: 0.01,
                        minValue: 0,
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
                name: 'Custom Char Light',
                outputs: 2,
                parentService: '',
                serviceName: 'Lightbulb',
                serialNo: 'Custom-Char-Light',
                softwareRev: '1.0.0',
                topic: '',
                waitForSetupMsg: false,
                wires: [['helper-output'], ['helper-output']],
                x: 320,
                y: 180,
                z: flowId,
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
                serialNo: 'Custom-Char-Light',
                softwareRev: '1.0.0',
                type: 'homekit-bridge',
            },
            { id: 'helper-output', type: 'helper' },
        ],
        serviceId,
    }
}

describe('Custom Characteristics', () => {
    let cleanupUserDir: (() => void) | undefined

    beforeAll(async () => {
        cleanupUserDir = configureNodeRedTestSettings()
    })

    afterAll(async () => {
        cleanupUserDir?.()
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        await unloadNodeRedFlow()
    })

    it('loads experimental custom characteristics and applies them to a service', async () => {
        const customCharacteristics = [
            {
                UUID: 'A2C5E7B1-9C8D-4F4C-9C5E-000000000001',
                description: 'Voltage used by Eve.app style devices',
                format: Formats.FLOAT,
                maxValue: '240',
                minStep: '0.1',
                minValue: '0',
                validValueRanges: ['0', '240'],
                name: 'Eve Volt',
                perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
            },
            {
                UUID: 'A2C5E7B1-9C8D-4F4C-9C5E-000000000002',
                description: 'Total energy usage',
                format: Formats.FLOAT,
                maxValue: 999999,
                minStep: 0.01,
                minValue: 0,
                name: 'Total Energy Usage',
                perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
            },
        ]

        vi.spyOn(Storage, 'loadCustomCharacteristics').mockResolvedValue(
            customCharacteristics
        )

        const api = APIFactory({
            auth: {
                needsPermission:
                    () => (_req: unknown, _res: unknown, next: () => void) =>
                        next(),
            },
            httpAdmin: {
                get: () => undefined,
                post: () => undefined,
            },
            nodes: {
                eachNode: () => undefined,
                getNode: () => undefined,
            },
        } as never)

        api.init()
        await new Promise((resolve) => setImmediate(resolve))

        const { flow, serviceId } = buildCustomCharacteristicFlow()

        await loadNodeRedFlow(
            [nrchkb, homekitBridgeNode, homekitServiceNode],
            flow
        )

        const node = helper.getNode(serviceId)
        const eveVolt = node.service.getCharacteristic(Characteristic.EveVolt)

        expect(eveVolt.props.format).toBe(Formats.FLOAT)
        expect(eveVolt.props.minValue).toBe(0)
        expect(eveVolt.props.maxValue).toBe(240)
        expect(eveVolt.props.validValueRanges).toEqual([0, 240])

        const helperOutput = helper.getNode('helper-output')
        const message = waitForInput<Record<string, any>>(helperOutput)

        node.receive({
            payload: {
                Context: { origin: 'custom-characteristics' },
                EveVolt: 123.4,
            },
        })

        const msg = await message
        expect(msg.payload).toMatchObject({
            EveVolt: 123.4,
        })
        expect(msg.hap.context).toEqual({ origin: 'custom-characteristics' })
        expect(msg.hap.newValue).toBe(123.4)
    })
})
