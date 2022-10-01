import helper from 'node-red-node-test-helper'

export const switchServiceBridgeFlow = () => {
    const serviceId = `s1.${Date.now()}`
    const bridgeId = `b1.${Date.now()}`
    const flowId = `f1.${Date.now()}`

    return {
        serviceId,
        bridgeId,
        flowId,
        flow: [
            {
                id: serviceId,
                type: 'homekit-service',
                z: flowId,
                isParent: true,
                hostType: '0',
                bridge: bridgeId,
                accessoryId: '',
                parentService: '',
                name: 'Example Switch',
                serviceName: 'Switch',
                topic: '',
                filter: false,
                manufacturer: 'NRCHKB',
                model: '0.130.7',
                serialNo: 'Default Serial Number',
                firmwareRev: '0.130.7',
                hardwareRev: '0.130.7',
                softwareRev: '0.130.7',
                cameraConfigVideoProcessor: 'ffmpeg',
                cameraConfigSource: '',
                cameraConfigStillImageSource: '',
                cameraConfigMaxStreams: 2,
                cameraConfigMaxWidth: 1280,
                cameraConfigMaxHeight: 720,
                cameraConfigMaxFPS: 10,
                cameraConfigMaxBitrate: 300,
                cameraConfigVideoCodec: 'libx264',
                cameraConfigAudioCodec: 'libfdk_aac',
                cameraConfigAudio: false,
                cameraConfigPacketSize: 1316,
                cameraConfigVerticalFlip: false,
                cameraConfigHorizontalFlip: false,
                cameraConfigMapVideo: '0:0',
                cameraConfigMapAudio: '0:1',
                cameraConfigVideoFilter: 'scale=1280:720',
                cameraConfigAdditionalCommandLine: '-tune zerolatency',
                cameraConfigDebug: false,
                cameraConfigSnapshotOutput: 'disabled',
                cameraConfigInterfaceName: '',
                characteristicProperties: '{}',
                waitForSetupMsg: false,
                outputs: 2,
                x: 350,
                y: 240,
                wires: [['h1'], ['h1']],
            },
            {
                id: bridgeId,
                type: 'homekit-bridge',
                bridgeName: 'Example Bridge',
                pinCode: '111-11-111',
                port: '',
                allowInsecureRequest: false,
                manufacturer: 'NRCHKB',
                model: '0.130.7',
                serialNo: 'Default Serial Number',
                firmwareRev: '0.130.7',
                hardwareRev: '0.130.7',
                softwareRev: '0.130.7',
                customMdnsConfig: false,
                mdnsMulticast: true,
                mdnsInterface: '',
                mdnsPort: '',
                mdnsIp: '',
                mdnsTtl: '',
                mdnsLoopback: true,
                mdnsReuseAddr: true,
                allowMessagePassthrough: true,
            },
            { id: 'h1', type: 'helper' },
        ] as helper.TestFlows,
    }
}
