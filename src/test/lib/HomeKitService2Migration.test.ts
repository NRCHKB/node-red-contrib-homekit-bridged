import { describe, expect, it } from 'vitest'

import {
    migrateHomeKitServiceFlow,
    migrateHomeKitServiceNode,
} from '../../lib/migration/HomeKitService2Migration'

describe('HomeKit service2 migration', () => {
    it('converts a homekit-service node to legacy homekit-service2', () => {
        const node = {
            id: 'service-1',
            type: 'homekit-service',
            serviceName: 'Switch',
            name: 'Switch',
            bridge: 'bridge-1',
            parentService: '',
            outputs: 2,
            wires: [['debug-1'], ['debug-2']],
        }

        const migrated = migrateHomeKitServiceNode(node)

        expect(migrated).toBe(true)
        expect(node).toMatchObject({
            id: 'service-1',
            type: 'homekit-service2',
            outputMode: 'legacy',
            useEventCallback: false,
            outputs: 2,
            wires: [['debug-1'], ['debug-2']],
        })
    })

    it('migrates camera control to the plugin-backed Camera service', () => {
        const node = {
            id: 'camera-1',
            type: 'homekit-service',
            serviceName: 'CameraControl',
            name: 'Front Camera',
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
            outputs: 3,
            wires: [['change'], ['set'], ['snapshot']],
        }

        migrateHomeKitServiceNode(node)

        expect(node.type).toBe('homekit-service2')
        expect(node.serviceName).toBe('Camera')
        expect(node.outputs).toBe(3)
        expect(node.wires).toEqual([['change'], ['set'], ['snapshot']])
        expect((node as any).plugins).toEqual([
            expect.objectContaining({
                id: 'node-red-contrib-homekit-bridged:homebridge-camera-ffmpeg',
                automatic: true,
                modified: false,
                config: expect.objectContaining({
                    videoProcessor: 'ffmpeg',
                    camera: expect.objectContaining({
                        name: 'Front Camera',
                        videoConfig: expect.objectContaining({
                            source: '-re -i rtsp://camera/live',
                            stillImageSource: '-i http://camera/snapshot.jpg',
                            audio: true,
                            debug: true,
                        }),
                    }),
                }),
            }),
        ])
    })

    it('converts all old service nodes and leaves service2 nodes unchanged', () => {
        const service2 = {
            id: 'service-2',
            type: 'homekit-service2',
            outputMode: 'events',
            useEventCallback: true,
            outputs: 1,
        }
        const flow = [
            {
                id: 'service-1',
                type: 'homekit-service',
                serviceName: 'Switch',
                wires: [['debug-1'], ['debug-2']],
            },
            service2,
            {
                id: 'debug-1',
                type: 'debug',
            },
        ]

        const result = migrateHomeKitServiceFlow(flow)

        expect(result).toMatchObject({
            migrated: 1,
            cameraMigrated: 0,
            skipped: 2,
        })
        expect(flow[0]).toMatchObject({
            type: 'homekit-service2',
            outputMode: 'legacy',
            useEventCallback: false,
            outputs: 2,
        })
        expect(flow[1]).toBe(service2)
        expect(flow[1]).toMatchObject({
            outputMode: 'events',
            useEventCallback: true,
            outputs: 1,
        })
    })
})
