import { afterEach, describe, expect, it } from 'vitest'
import {
    HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID,
    mapLegacyCameraConfigToPluginConfig,
    registerEmbeddedPlugins,
} from '../../plugins/embedded'
import { clearPluginsForTest, getPlugin } from '../../plugins/registry'

describe('Homebridge Camera FFmpeg embedded plugin', () => {
    afterEach(() => {
        clearPluginsForTest()
    })

    it('registers NRCHKB-owned metadata with separate upstream attribution', () => {
        registerEmbeddedPlugins()

        const plugin = getPlugin(HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID)

        expect(plugin?.metadata).toMatchObject({
            id: 'node-red-contrib-homekit-bridged:homebridge-camera-ffmpeg',
            packageName: 'node-red-contrib-homekit-bridged',
            pluginName: 'homebridge-camera-ffmpeg',
            displayName: 'Homebridge Camera FFmpeg',
            author: 'NRCHKB',
            prerequisites: {
                serviceNames: ['Camera'],
            },
            multipleInstances: false,
            upstream: expect.objectContaining({
                packageName: '@homebridge-plugins/homebridge-camera-ffmpeg',
                projectName: 'Homebridge Camera FFmpeg',
                license: 'ISC',
            }),
            editor: expect.objectContaining({
                defaultConfig: expect.objectContaining({
                    videoProcessor: 'ffmpeg',
                }),
            }),
        })

        expect(plugin?.metadata.editor?.sections[0].fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: 'camera.videoConfig.source',
                    label: 'Source',
                    type: 'text',
                }),
                expect.objectContaining({
                    path: 'camera.videoConfig.audio',
                    label: 'Audio',
                    type: 'checkbox',
                }),
                expect.objectContaining({
                    path: 'camera.videoConfig.recording',
                    label: 'Recording',
                    type: 'checkbox',
                    default: true,
                }),
                expect.objectContaining({
                    path: 'camera.videoConfig.prebuffer',
                    label: 'Prebuffer',
                    type: 'checkbox',
                    default: true,
                }),
            ])
        )
    })

    it('maps legacy camera fields to upstream videoConfig', () => {
        const config = mapLegacyCameraConfigToPluginConfig({
            name: 'Front Camera',
            cameraConfigVideoProcessor: 'ffmpeg',
            cameraConfigSource: '-re -i rtsp://camera/live',
            cameraConfigStillImageSource: '-i http://camera/snapshot.jpg',
            cameraConfigMaxStreams: 2,
            cameraConfigMaxWidth: 1280,
            cameraConfigMaxHeight: 720,
            cameraConfigMaxFPS: 10,
            cameraConfigMaxBitrate: 300,
            cameraConfigVideoCodec: 'libx264',
            cameraConfigAudio: true,
            cameraConfigPacketSize: 1316,
            cameraConfigMapVideo: '0:0',
            cameraConfigMapAudio: '0:1',
            cameraConfigVideoFilter: 'scale=1280:720',
            cameraConfigAdditionalCommandLine: '-tune zerolatency',
            cameraConfigDebug: true,
            cameraConfigDebugReturn: true,
            cameraConfigRecording: false,
            cameraConfigPrebuffer: true,
        })

        expect(config.camera?.videoConfig).toMatchObject({
            source: '-re -i rtsp://camera/live',
            stillImageSource: '-i http://camera/snapshot.jpg',
            maxStreams: 2,
            maxWidth: 1280,
            maxHeight: 720,
            maxFPS: 10,
            maxBitrate: 300,
            vcodec: 'libx264',
            audio: true,
            packetSize: 1316,
            mapvideo: '0:0',
            mapaudio: '0:1',
            videoFilter: 'scale=1280:720',
            encoderOptions: '-tune zerolatency',
            debug: true,
            debugReturn: true,
            recording: false,
            prebuffer: true,
        })
    })

    it('preserves string false values from imported legacy camera flows', () => {
        const config = mapLegacyCameraConfigToPluginConfig({
            cameraConfigAudio: 'false',
            cameraConfigDebug: 'false',
        })

        expect(config.camera?.videoConfig).toMatchObject({
            audio: false,
            debug: false,
        })
    })
})
