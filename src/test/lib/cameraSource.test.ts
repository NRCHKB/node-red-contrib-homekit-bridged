import assert from 'assert'
import { describe, it } from 'mocha'

const Camera = require('../../lib/cameraSource').Camera

const createCamera = (videoProcessor: string) => {
    const camera = Object.create(Camera.prototype)

    Object.assign(camera, {
        acodec: 'libfdk_aac',
        additionalCommandline: '',
        audio: false,
        debug: false,
        ffmpegSource: '-f lavfi -i testsrc',
        fps: 30,
        hflip: false,
        mapaudio: '0:a',
        mapvideo: '0:v',
        maxBitrate: 300,
        name: 'Test Camera',
        ongoingSessions: {},
        packetsize: 1316,
        pendingSessions: {
            session: {
                address: '127.0.0.1',
                video_port: 1234,
                video_srtp: Buffer.alloc(30),
                video_ssrc: 1,
            },
        },
        vcodec: 'libx264',
        videoFilter: '',
        videoProcessor,
        vflip: false,
    })

    return camera
}

describe('cameraSource', function () {
    it('completes a failed stream request exactly once', function (done) {
        const camera = createCamera('/path/that/does/not/exist/ffmpeg')
        let callbackCount = 0

        camera.handleStreamRequest(
            {
                sessionID: 'session',
                type: 'start',
                video: {
                    fps: 30,
                    height: 720,
                    max_bit_rate: 300,
                    width: 1280,
                },
            },
            (error: Error) => {
                callbackCount++
                assert.ok(error)

                setTimeout(() => {
                    assert.strictEqual(callbackCount, 1)
                    done()
                }, 20)
            }
        )
    })
})
