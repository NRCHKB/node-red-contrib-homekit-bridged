import { Characteristic, Formats, Perms } from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
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

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

const buildLightbulbFlow = () => {
    const serviceId = `lightbulb.${Date.now()}`
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
    })

    it('routes Brightness values and preserves msg.hap.context', async () => {
        const { flow, serviceId } = buildLightbulbFlow()

        await loadNodeRedFlow(
            [nrchkb, homekitBridgeNode, homekitServiceNode],
            flow
        )

        const node = helper.getNode(serviceId)
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

        const node = helper.getNode(serviceId)
        const colorTemperature = node.service.getCharacteristic(
            Characteristic.ColorTemperature
        )

        expect(node.adaptiveLightingController).toBeDefined()

        const helperOutput = helper.getNode('helper-output')
        const message = waitForInput<Record<string, any>>(helperOutput)

        colorTemperature.emit('change', {
            context: { source: 'homekit' },
            newValue: 350,
            oldValue: 300,
            originator: undefined,
            reason: 'write',
        })

        const msg = await message
        expect(msg.payload).toMatchObject({
            ColorTemperature: 350,
        })
        expect(msg.hap.context).toEqual({ source: 'homekit' })
        expect(node.adaptiveLightingController).toBeDefined()
    })
})
