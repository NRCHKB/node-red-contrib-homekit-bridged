import {
    H264Level,
    H264Profile,
    SRTPCryptoSuites,
    StreamRequestTypes,
    VideoCodecPacketizationMode,
    VideoCodecType,
} from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => {
    type Handler = (...args: any[]) => void

    const childHandlers = new Map<string, Handler>()
    const stdoutHandlers = new Map<string, Handler>()
    const stderrHandlers = new Map<string, Handler>()
    const spawnMock = vi.fn(() => fakeChild)

    const fakeChild: {
        on: (event: string, handler: Handler) => void
        removeAllListeners: () => void
        stderr: {
            on: (event: string, handler: Handler) => void
            removeAllListeners: () => void
        }
        stdout: {
            on: (event: string, handler: Handler) => void
            removeAllListeners: () => void
        }
    } = {
        on: (event: string, handler: Handler) => {
            childHandlers.set(event, handler)
        },
        removeAllListeners: () => {
            childHandlers.clear()
        },
        stderr: {
            on: (event: string, handler: Handler) => {
                stderrHandlers.set(event, handler)
            },
            removeAllListeners: () => {
                stderrHandlers.clear()
            },
        },
        stdout: {
            on: (event: string, handler: Handler) => {
                stdoutHandlers.set(event, handler)
            },
            removeAllListeners: () => {
                stdoutHandlers.clear()
            },
        },
    }

    return {
        emitExit: (code: number, signal?: string) => {
            childHandlers.get('exit')?.(code, signal)
        },
        emitStderr: (data: Buffer) => {
            stderrHandlers.get('data')?.(data)
        },
        emitStdout: (data: Buffer) => {
            stdoutHandlers.get('data')?.(data)
        },
        reset: () => {
            childHandlers.clear()
            stderrHandlers.clear()
            stdoutHandlers.clear()
            spawnMock.mockClear()
        },
        spawnMock,
    }
})

vi.mock('node:child_process', () => ({
    spawn: mockState.spawnMock,
}))

import { configureCamera } from '../../../lib/camera/CameraControl'
import { CameraDelegate } from '../../../lib/camera/CameraDelegate'

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

describe('CameraDelegate', () => {
    afterEach(() => {
        mockState.reset()
    })

    it('streams snapshot bytes from ffmpeg output', async () => {
        const camera = new CameraDelegate(
            { displayName: 'Camera', UUID: 'camera-uuid' } as never,
            {
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
                cameraConfigSnapshotOutput: 'content',
                cameraConfigSource: 'rtsp://camera/live',
                cameraConfigStillImageSource: 'still-image-source',
                cameraConfigVideoCodec: 'libx264',
                cameraConfigVideoFilter: 'scale=1280:720',
                cameraConfigVideoProcessor: 'ffmpeg',
                cameraConfigVerticalFlip: false,
                name: 'Camera',
            }
        )

        const snapshotPromise = new Promise<Buffer>((resolve) => {
            camera.handleSnapshotRequest(
                {
                    height: 720,
                    width: 1280,
                },
                (_error, buffer) => {
                    resolve(buffer)
                }
            )

            mockState.emitStdout(Buffer.from('snapshot-bytes'))
            mockState.emitExit(0)
        })

        const buffer = await snapshotPromise

        expect(buffer.toString()).toBe('snapshot-bytes')
        expect(mockState.spawnMock).toHaveBeenCalledTimes(1)
    })

    it('preserves quoted ffmpeg arguments when spawning snapshot capture', async () => {
        const camera = new CameraDelegate(
            { displayName: 'Camera', UUID: 'camera-uuid' } as never,
            {
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
                cameraConfigSnapshotOutput: 'content',
                cameraConfigSource: '',
                cameraConfigStillImageSource:
                    '-f lavfi -i "testsrc=s=640x480:r=15"',
                cameraConfigVideoCodec: 'libx264',
                cameraConfigVideoFilter: 'scale=1280:720',
                cameraConfigVideoProcessor: 'ffmpeg',
                cameraConfigVerticalFlip: false,
                name: 'Camera',
            }
        )

        const snapshotPromise = new Promise<void>((resolve) => {
            camera.handleSnapshotRequest(
                {
                    height: 480,
                    width: 640,
                },
                () => resolve()
            )

            mockState.emitStdout(Buffer.from('snapshot-bytes'))
            mockState.emitExit(0)
        })

        await snapshotPromise

        expect(mockState.spawnMock).toHaveBeenCalledTimes(1)
        expect(mockState.spawnMock.mock.calls[0]?.[1]).toContain(
            'testsrc=s=640x480:r=15'
        )
    })

    it('registers a camera controller on the accessory', () => {
        const accessory = {
            configureController: vi.fn(),
        } as never

        configureCamera(accessory, {
            cameraConfigAdditionalCommandLine: '',
            cameraConfigAudio: 'false',
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
            cameraConfigSnapshotOutput: 'content',
            cameraConfigSource: 'rtsp://camera/live',
            cameraConfigStillImageSource: 'still-image-source',
            cameraConfigVideoCodec: 'libx264',
            cameraConfigVideoFilter: 'scale=1280:720',
            cameraConfigVideoProcessor: 'ffmpeg',
            cameraConfigVerticalFlip: false,
            name: 'Camera',
        })

        expect(accessory.configureController).toHaveBeenCalledTimes(1)
    })

    it('applies flip filters even when no custom video filter is configured', async () => {
        const camera = new CameraDelegate(
            { displayName: 'Camera', UUID: 'camera-uuid' } as never,
            {
                cameraConfigAdditionalCommandLine: '',
                cameraConfigAudio: false,
                cameraConfigAudioCodec: 'libfdk_aac',
                cameraConfigDebug: false,
                cameraConfigHorizontalFlip: true,
                cameraConfigInterfaceName: '',
                cameraConfigMapAudio: '0:1',
                cameraConfigMapVideo: '0:0',
                cameraConfigMaxBitrate: 300,
                cameraConfigMaxFPS: 10,
                cameraConfigMaxHeight: 720,
                cameraConfigMaxStreams: 2,
                cameraConfigMaxWidth: 1280,
                cameraConfigPacketSize: 1316,
                cameraConfigSnapshotOutput: 'content',
                cameraConfigSource: '-f lavfi -i testsrc=s=320x240:r=15',
                cameraConfigStillImageSource: '',
                cameraConfigVideoCodec: 'libx264',
                cameraConfigVideoFilter: '',
                cameraConfigVideoProcessor: 'ffmpeg',
                cameraConfigVerticalFlip: false,
                name: 'Camera',
            }
        )

        const sessionId = 'stream-session'
        camera.prepareStream(
            {
                addressVersion: 'ipv4',
                audio: {} as never,
                sessionID: sessionId,
                sourceAddress: '127.0.0.1',
                targetAddress: '127.0.0.1',
                video: {
                    port: 5000,
                    srtpCryptoSuite: SRTPCryptoSuites.NONE,
                    srtp_key: Buffer.from('1234567890123456'),
                    srtp_salt: Buffer.from('12345678901234'),
                },
            },
            () => undefined
        )

        const startPromise = new Promise<void>((resolve, reject) => {
            camera.handleStreamRequest(
                {
                    audio: {} as never,
                    sessionID: sessionId,
                    type: StreamRequestTypes.START,
                    video: {
                        codec: VideoCodecType.H264,
                        fps: 30,
                        height: 240,
                        level: H264Level.LEVEL3_1,
                        max_bit_rate: 300,
                        mtu: 1316,
                        packetizationMode:
                            VideoCodecPacketizationMode.NON_INTERLEAVED,
                        profile: H264Profile.BASELINE,
                        pt: 99,
                        rtcp_interval: 0.5,
                        ssrc: 1,
                        width: 320,
                    },
                },
                (error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                }
            )

            mockState.emitStderr(Buffer.from('frame=1'))
        })

        await startPromise

        const args = mockState.spawnMock.mock.calls[0]?.[1] as string[]
        expect(args).toContain('-vf')
        expect(args).toContain('hflip')
    })
})
