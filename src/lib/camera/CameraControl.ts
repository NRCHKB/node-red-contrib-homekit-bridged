import {
    type Accessory,
    AudioBitrate,
    AudioRecordingCodecType,
    AudioRecordingSamplerate,
    CameraController,
    H264Level,
    H264Profile,
    MediaContainerType,
    SRTPCryptoSuites,
    VideoCodecType,
} from '@homebridge/hap-nodejs'
import type CameraConfigType from '../types/CameraConfigType'
import { CameraDelegate } from './CameraDelegate'

export const configureCamera = (
    accessory: Accessory,
    config?: CameraConfigType
) => {
    const streamDelegate = new CameraDelegate(accessory, config)

    const cameraController = new CameraController({
        cameraStreamCount: Math.max(1, config?.cameraConfigMaxStreams || 2), // default 2
        delegate: streamDelegate,

        streamingOptions: {
            // srtp: true, // legacy option which will just enable AES_CM_128_HMAC_SHA1_80 (can still be used though)

            // iOS does not support NONE just there for testing with Wireshark, for example
            supportedCryptoSuites: [
                SRTPCryptoSuites.NONE,
                SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80,
            ],
            video: {
                codec: {
                    profiles: [
                        H264Profile.BASELINE,
                        H264Profile.MAIN,
                        H264Profile.HIGH,
                    ],
                    levels: [
                        H264Level.LEVEL3_1,
                        H264Level.LEVEL3_2,
                        H264Level.LEVEL4_0,
                    ],
                },
                resolutions: (() => {
                    // keep defaults but constrain to configured max width/height/fps if provided
                    const maxW = config?.cameraConfigMaxWidth
                    const maxH = config?.cameraConfigMaxHeight
                    const maxFps = config?.cameraConfigMaxFPS
                    const defaults: [number, number, number][] = [
                        [1920, 1080, 30],
                        [1280, 960, 30],
                        [1280, 720, 30],
                        [1024, 768, 30],
                        [640, 480, 30],
                        [640, 360, 30],
                        [480, 360, 30],
                        [480, 270, 30],
                        [320, 240, 30],
                        [320, 240, 15],
                        [320, 180, 30],
                    ]
                    return defaults
                        .filter(
                            ([w, h]) =>
                                (!maxW || w <= maxW) && (!maxH || h <= maxH)
                        )
                        .map(([w, h, f]) => [w, h, Math.min(f, maxFps || f)])
                })(),
            },
            // audio options intentionally omitted here; delegate will honor config for RTP audio path
        },
        recording: {
            options: {
                prebufferLength: 4000,
                mediaContainerConfiguration: {
                    type: MediaContainerType.FRAGMENTED_MP4,
                    fragmentLength: 4000,
                },
                video: {
                    type: VideoCodecType.H264,
                    parameters: {
                        profiles: [H264Profile.HIGH],
                        levels: [H264Level.LEVEL4_0],
                    },
                    resolutions: [
                        [320, 180, 30],
                        [320, 240, 15],
                        [320, 240, 30],
                        [480, 270, 30],
                        [480, 360, 30],
                        [640, 360, 30],
                        [640, 480, 30],
                        [1280, 720, 30],
                        [1280, 960, 30],
                        [1920, 1080, 30],
                        [1600, 1200, 30],
                    ],
                },
                audio: {
                    codecs: {
                        type: AudioRecordingCodecType.AAC_ELD,
                        audioChannels: 1,
                        samplerate: AudioRecordingSamplerate.KHZ_48,
                        bitrateMode: AudioBitrate.VARIABLE,
                    },
                },
            },

            delegate: streamDelegate,
        },

        sensors: {
            motion: true,
            occupancy: true,
        },
    })
    streamDelegate.controller = cameraController

    accessory.configureController(cameraController)
}
