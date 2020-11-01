import 'should'
import { describe, beforeEach, afterEach, it } from 'mocha'

const helper = require('node-red-node-test-helper')

const nrchkb = require('../../build/nodes/nrchkb')
const homekitBridgeNode = require('../../build/nodes/bridge')
const homekitServiceNode = require('../../build/nodes/service')

helper.init(require.resolve('node-red'))

const flow = [
    {
        id: 's1',
        type: 'homekit-service',
        z: '164eade1.c33b62',
        isParent: true,
        hostType: '0',
        bridge: '129db7b5.160d88',
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
        wires: [[], []],
    },
    {
        id: '129db7b5.160d88',
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
]

describe('Service Node', function () {
    this.timeout(30000)

    beforeEach(function (done) {
        helper.startServer(done)
    })

    afterEach(function (done) {
        helper.unload()
        helper.stopServer(done)
    })

    it('should be loaded', function (done) {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('s1')
                    s1.should.have.property('type', 'homekit-service')
                    done()
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output ON:true payload', function (done) {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('s1')

                    s1.on('input', (msg: any) => {
                        msg.should.have.property('On', true)
                        done()
                    })

                    s1.receive({ On: true })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output ON:false payload', function (done) {
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitServiceNode],
                flow,
                function () {
                    const s1 = helper.getNode('s1')

                    s1.on('input', function (msg: any) {
                        msg.should.have.property('On', false)
                        done()
                    })

                    s1.receive({ On: false })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
