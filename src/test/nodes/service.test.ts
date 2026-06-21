import { Accessory, Bridge } from '@homebridge/hap-nodejs'
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
import HAPServiceNodeType from '../../lib/types/HAPServiceNodeType'
import { describeCommonSwitchServiceBehavior } from '../test-utils/common-switch-service-tests'
import { switchServiceBridgeFlow } from '../test-utils/data'
import { configureNodeRedTestSettings } from '../test-utils/vitest-helper'

const homekitBridgeNode = require('../../../build/nodes/bridge')
const nrchkb = require('../../../build/nodes/nrchkb')
const homekitServiceNode = require('../../../build/nodes/service')

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

const publishSpy = vi
    .spyOn(Bridge.prototype, 'publish')
    .mockImplementation(function () {
        return true as never
    })
vi.spyOn(Bridge.prototype, 'unpublish').mockResolvedValue(undefined)
vi.spyOn(Accessory.prototype, 'publish').mockImplementation(function () {
    return true as never
})
vi.spyOn(Accessory.prototype, 'unpublish').mockResolvedValue(undefined)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const buildWaitForSetupFlow = () => {
    const bridgeId = `bridge.${Date.now()}`
    const flowId = `flow.${Date.now()}`
    const firstServiceId = `service.first.${Date.now()}`
    const secondServiceId = `service.second.${Date.now()}`

    const createService = (id: string, name: string) => ({
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
        characteristicProperties: '{}',
        filter: false,
        firmwareRev: '1.0.0',
        hardwareRev: '1.0.0',
        hostType: '0',
        id,
        isParent: true,
        manufacturer: 'NRCHKB',
        model: '1.0.0',
        name,
        outputs: 2,
        parentService: '',
        serviceName: 'Switch',
        serialNo: name,
        softwareRev: '1.0.0',
        topic: '',
        waitForSetupMsg: true,
        wires: [[], []],
        x: 320,
        y: 180,
        z: flowId,
    })

    return {
        firstServiceId,
        flow: [
            createService(firstServiceId, 'First Switch'),
            createService(secondServiceId, 'Delayed Switch'),
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
                serialNo: 'Bridge',
                softwareRev: '1.0.0',
                type: 'homekit-bridge',
            },
        ],
        secondServiceId,
    }
}

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
        vi.clearAllMocks()
        return helper.unload()
    })

    describeCommonSwitchServiceBehavior({
        buildFlow: switchServiceBridgeFlow,
        expectedType: 'homekit-service',
        nodes: [nrchkb, homekitBridgeNode, homekitServiceNode],
        title: 'shared switch behavior',
    })

    it('waits for every wait-for-setup service on a bridge before publishing', async () => {
        const { firstServiceId, flow, secondServiceId } =
            buildWaitForSetupFlow()

        await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)

        const firstService = helper.getNode(
            firstServiceId
        ) as HAPServiceNodeType
        const secondService = helper.getNode(secondServiceId)

        firstService.receive({
            payload: {
                nrchkb: {
                    setup: {},
                },
            },
        })

        await wait(350)

        expect(publishSpy).not.toHaveBeenCalled()

        secondService.receive({
            payload: {
                nrchkb: {
                    setup: {},
                },
            },
        })

        await wait(350)

        expect(publishSpy).toHaveBeenCalledTimes(1)
        expect(firstService.hostNode.host.bridgedAccessories).toHaveLength(2)
    })
})
