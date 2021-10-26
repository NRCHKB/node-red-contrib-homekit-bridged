const helper = require('node-red-node-test-helper')

const nrchkb = require('../../../build/nodes/nrchkb')
const homekitBridgeNode = require('../../../build/nodes/bridge')
const homekitServiceNode = require('../../../build/nodes/service')

helper.init(require.resolve('node-red'))

const flow = [
    {
        id: '5ad1672bc4876b81',
        type: 'homekit-service',
        z: '8ec04ba1.f36a38',
        isParent: true,
        hostType: '0',
        bridge: '4cfa72ab8e197e91',
        accessoryId: '',
        parentService: '',
        name: 'Example Switch',
        serviceName: 'Switch',
        topic: '',
        filter: false,
        manufacturer: 'NRCHKB',
        model: '1.4.3',
        serialNo: 'Default Serial Number',
        firmwareRev: '1.4.3',
        hardwareRev: '1.4.3',
        softwareRev: '1.4.3',
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
        x: 1270,
        y: 500,
        wires: [[], []],
    },
    {
        id: '4cfa72ab8e197e91',
        type: 'homekit-bridge',
        bridgeName: 'Example Bridge',
        pinCode: '917-02-252',
        port: '',
        advertiser: 'ciao',
        allowInsecureRequest: true,
        manufacturer: 'NRCHKB',
        model: '1.4.3',
        serialNo: 'Default Serial Number',
        firmwareRev: '1.4.3',
        hardwareRev: '1.4.3',
        softwareRev: '1.4.3',
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
]

describe('Service Node - should be loaded', () => {
    beforeEach((done) => {
        helper.startServer(done)
    })

    afterEach((done) => {
        helper.unload().then(() => {
            helper.stopServer(done)
        })
    })

    test('should be loaded', (done) => {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('5ad1672bc4876b81')

                    s1.on('input', () => {
                        expect(s1.type).toEqual('homekit-service')
                        done()
                    })

                    s1.receive({ payload: {} })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})

describe('Service Node - should output ON:true payload', () => {
    beforeEach((done) => {
        helper.startServer(done)
    })

    afterEach((done) => {
        helper.unload().then(() => {
            helper.stopServer(done)
        })
    })

    test('should output ON:true payload', (done) => {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('5ad1672bc4876b81')

                    s1.on('input', (msg: any) => {
                        expect(msg.payload.On).toEqual(true)
                        done()
                    })

                    s1.receive({ payload: { On: true } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})

describe('Service Node - should output ON:false payload', () => {
    beforeEach((done) => {
        helper.startServer(done)
    })

    afterEach((done) => {
        helper.unload().then(() => {
            helper.stopServer(done)
        })
    })

    test('should output ON:false payload', (done) => {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('5ad1672bc4876b81')

                    s1.on('input', function (msg: any) {
                        expect(msg.payload.On).toEqual(false)
                        done()
                    })

                    s1.receive({ payload: { On: false } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
