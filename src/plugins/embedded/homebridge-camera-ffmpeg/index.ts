import type { Accessory, Service } from '@homebridge/hap-nodejs'
import { Service as HAPService } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type {
    NRCHKBPluginAttachContext,
    NRCHKBPluginConfigEntry,
    NRCHKBPluginFactory,
    NRCHKBPluginMetadata,
} from '../../registry'
import { normalizePluginId, registerPlugin } from '../../registry'

export const HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_NAME = 'homebridge-camera-ffmpeg'
export const HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID = normalizePluginId(
    'node-red-contrib-homekit-bridged',
    HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_NAME
)

type PackageJson = {
    version?: string
    license?: string
    author?: { name?: string } | string
    contributors?: Array<{ name?: string } | string>
}

type VideoConfig = {
    source?: string
    stillImageSource?: string
    returnAudioTarget?: string
    maxStreams?: number
    maxWidth?: number
    maxHeight?: number
    maxFPS?: number
    maxBitrate?: number
    forceMax?: boolean
    vcodec?: string
    packetSize?: number
    videoFilter?: string
    encoderOptions?: string
    mapvideo?: string
    mapaudio?: string
    audio?: boolean
    debug?: boolean
    debugReturn?: boolean
    recording?: boolean
    prebuffer?: boolean
}

export type HomebridgeCameraFfmpegPluginConfig = {
    videoProcessor?: string
    camera?: {
        name?: string
        manufacturer?: string
        model?: string
        serialNumber?: string
        firmwareRevision?: string
        motion?: boolean
        doorbell?: boolean
        switches?: boolean
        motionTimeout?: number
        motionDoorbell?: boolean
        videoConfig?: VideoConfig
    }
}

type StreamingDelegateModule = {
    StreamingDelegate: new (
        log: unknown,
        cameraConfig: NonNullable<HomebridgeCameraFfmpegPluginConfig['camera']>,
        api: {
            on: (event: string, handler: () => void) => void
        },
        hap: typeof import('@homebridge/hap-nodejs'),
        accessory: Accessory,
        videoProcessor?: string
    ) => {
        controller: unknown
    }
}

const requirePackageJson = (packageName: string): PackageJson => {
    try {
        // package.json is intentionally read from the installed dependency so
        // attribution follows the exact upstream version in node_modules.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${packageName}/package.json`) as PackageJson
    } catch (_) {
        return {}
    }
}

const upstreamPackage = requirePackageJson(
    '@homebridge-plugins/homebridge-camera-ffmpeg'
)

const toName = (value: { name?: string } | string | undefined): string =>
    typeof value === 'string' ? value : (value?.name ?? '')

const upstreamAuthor = toName(upstreamPackage.author)
const upstreamContributors =
    upstreamPackage.contributors?.map(toName).filter(Boolean) ?? []

const toBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true'
    }

    return Boolean(value)
}

const importEsm = (specifier: string): Promise<unknown> => {
    const importer = new Function('specifier', 'return import(specifier)')
    return importer(specifier) as Promise<unknown>
}

const createHomebridgeLogger = () => {
    const log = logger('NRCHKB', 'HomebridgeCameraFFmpeg')

    const write =
        (level: 'debug' | 'info' | 'warn' | 'error') =>
        (message: string, ...parameters: unknown[]) => {
            const suffix = parameters.length ? ` ${parameters.join(' ')}` : ''
            const text = `${message}${suffix}`
            if (level === 'debug') {
                log.debug(text)
            } else if (level === 'error') {
                log.error(text)
            } else {
                log.debug(text)
            }
        }

    return {
        debug: write('debug'),
        info: write('info'),
        warn: write('warn'),
        error: write('error'),
        success: write('info'),
        log: write('info'),
    }
}

const createHomebridgeApiShim = () => ({
    on: (_event: string, _handler: () => void) => {
        // Node-RED owns process lifecycle; service close handlers clean up
        // accessory/controller state. The upstream delegate only needs this
        // hook for Homebridge shutdown cleanup.
    },
})

const getCameraConfig = (
    context: NRCHKBPluginAttachContext<HomebridgeCameraFfmpegPluginConfig>
): NonNullable<HomebridgeCameraFfmpegPluginConfig['camera']> => ({
    name: context.config.camera?.name ?? context.serviceInformation.name,
    manufacturer:
        context.config.camera?.manufacturer ??
        (context.serviceInformation.config.manufacturer as string | undefined),
    model:
        context.config.camera?.model ??
        (context.serviceInformation.config.model as string | undefined),
    serialNumber:
        context.config.camera?.serialNumber ??
        (context.serviceInformation.config.serialNo as string | undefined),
    firmwareRevision:
        context.config.camera?.firmwareRevision ??
        (context.serviceInformation.config.firmwareRev as string | undefined),
    motion: context.config.camera?.motion,
    doorbell: context.config.camera?.doorbell,
    switches: context.config.camera?.switches,
    motionTimeout: context.config.camera?.motionTimeout,
    motionDoorbell: context.config.camera?.motionDoorbell,
    videoConfig: {
        ...context.config.camera?.videoConfig,
    },
})

export const mapLegacyCameraConfigToPluginConfig = (
    config: Record<string, unknown>
): HomebridgeCameraFfmpegPluginConfig => ({
    videoProcessor: (config.cameraConfigVideoProcessor as string) || 'ffmpeg',
    camera: {
        name: config.name as string | undefined,
        manufacturer: config.manufacturer as string | undefined,
        model: config.model as string | undefined,
        serialNumber: config.serialNo as string | undefined,
        firmwareRevision: config.firmwareRev as string | undefined,
        videoConfig: {
            source: config.cameraConfigSource as string | undefined,
            stillImageSource: config.cameraConfigStillImageSource as
                | string
                | undefined,
            maxStreams: config.cameraConfigMaxStreams as number | undefined,
            maxWidth: config.cameraConfigMaxWidth as number | undefined,
            maxHeight: config.cameraConfigMaxHeight as number | undefined,
            maxFPS: config.cameraConfigMaxFPS as number | undefined,
            maxBitrate: config.cameraConfigMaxBitrate as number | undefined,
            vcodec: config.cameraConfigVideoCodec as string | undefined,
            audio: toBoolean(config.cameraConfigAudio),
            returnAudioTarget: config.cameraConfigReturnAudioTarget as
                | string
                | undefined,
            packetSize: config.cameraConfigPacketSize as number | undefined,
            forceMax: toBoolean(config.cameraConfigForceMax),
            mapvideo: config.cameraConfigMapVideo as string | undefined,
            mapaudio: config.cameraConfigMapAudio as string | undefined,
            videoFilter: config.cameraConfigVideoFilter as string | undefined,
            encoderOptions: config.cameraConfigAdditionalCommandLine as
                | string
                | undefined,
            debug: toBoolean(config.cameraConfigDebug),
            debugReturn: toBoolean(config.cameraConfigDebugReturn),
            recording: toBoolean(config.cameraConfigRecording),
            prebuffer: toBoolean(config.cameraConfigPrebuffer),
        },
    },
})

export const createAutomaticHomebridgeCameraFfmpegPluginEntry = (
    config: Record<string, unknown>
): NRCHKBPluginConfigEntry<HomebridgeCameraFfmpegPluginConfig> => ({
    id: HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID,
    automatic: true,
    modified: false,
    config: mapLegacyCameraConfigToPluginConfig(config),
})

export const homebridgeCameraFfmpegPluginMetadata: NRCHKBPluginMetadata = {
    id: HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID,
    packageName: 'node-red-contrib-homekit-bridged',
    pluginName: HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_NAME,
    displayName: 'Homebridge Camera FFmpeg',
    author: 'NRCHKB',
    version: '1.0.0',
    description:
        'Adds FFmpeg-backed HomeKit camera snapshots, live video, audio, and experimental recording features.',
    attachment: 'inline',
    license: 'Apache-2.0',
    capabilities: {
        camera: true,
        snapshots: true,
        liveVideo: true,
        audio: true,
        twoWayAudio: true,
        secureVideo: true,
        experimental: ['twoWayAudio', 'secureVideo'],
    },
    prerequisites: {
        serviceNames: ['Camera'],
    },
    multipleInstances: false,
    upstream: {
        packageName: '@homebridge-plugins/homebridge-camera-ffmpeg',
        packageVersion: upstreamPackage.version,
        projectName: 'Homebridge Camera FFmpeg',
        repoUrl:
            'https://github.com/homebridge-plugins/homebridge-camera-ffmpeg',
        license: upstreamPackage.license,
        authors: upstreamAuthor ? [upstreamAuthor] : [],
        contributors: upstreamContributors,
        disclaimer:
            'Original authors and contributors are credited for the upstream Homebridge plugin. NRCHKB owns and supports this embedded integration.',
    },
    editor: {
        defaultConfig: {
            videoProcessor: 'ffmpeg',
            camera: {
                videoConfig: {
                    source: '',
                    stillImageSource: '',
                    maxStreams: 2,
                    maxWidth: 1280,
                    maxHeight: 720,
                    maxFPS: 10,
                    maxBitrate: 300,
                    vcodec: 'libx264',
                    audio: false,
                    returnAudioTarget: '',
                    packetSize: 1316,
                    forceMax: false,
                    mapvideo: '0:0',
                    mapaudio: '0:1',
                    videoFilter: 'scale=1280:720',
                    encoderOptions: '-tune zerolatency',
                    debug: false,
                    debugReturn: false,
                    recording: true,
                    prebuffer: true,
                },
            },
        },
        sections: [
            {
                title: 'FFmpeg',
                description:
                    'Configure the command arguments used for HomeKit camera snapshots and live video.',
                fields: [
                    {
                        path: 'videoProcessor',
                        label: 'Video Processor',
                        type: 'text',
                        icon: 'fa-terminal',
                        placeholder: 'ffmpeg',
                        default: 'ffmpeg',
                    },
                    {
                        path: 'camera.videoConfig.source',
                        label: 'Source',
                        type: 'text',
                        icon: 'fa-sign-in',
                    },
                    {
                        path: 'camera.videoConfig.stillImageSource',
                        label: 'Still Image Source',
                        type: 'text',
                        icon: 'fa-picture-o',
                    },
                    {
                        path: 'camera.videoConfig.maxStreams',
                        label: 'Max Streams',
                        type: 'number',
                        icon: 'fa-random',
                        default: 2,
                    },
                    {
                        path: 'camera.videoConfig.maxWidth',
                        label: 'Max Width',
                        type: 'number',
                        icon: 'fa-arrows-h',
                        default: 1280,
                    },
                    {
                        path: 'camera.videoConfig.maxHeight',
                        label: 'Max Height',
                        type: 'number',
                        icon: 'fa-arrows-v',
                        default: 720,
                    },
                    {
                        path: 'camera.videoConfig.maxFPS',
                        label: 'Max FPS',
                        type: 'number',
                        icon: 'fa-clock-o',
                        default: 10,
                    },
                    {
                        path: 'camera.videoConfig.maxBitrate',
                        label: 'Max Bitrate',
                        type: 'number',
                        icon: 'fa-tachometer',
                        default: 300,
                    },
                    {
                        path: 'camera.videoConfig.vcodec',
                        label: 'Video Codec',
                        type: 'text',
                        icon: 'fa-film',
                        default: 'libx264',
                    },
                    {
                        path: 'camera.videoConfig.audio',
                        label: 'Audio',
                        type: 'checkbox',
                        icon: 'fa-headphones',
                        default: false,
                    },
                    {
                        path: 'camera.videoConfig.returnAudioTarget',
                        label: 'Return Audio Target',
                        type: 'text',
                        icon: 'fa-microphone',
                    },
                    {
                        path: 'camera.videoConfig.packetSize',
                        label: 'Packet Size',
                        type: 'number',
                        icon: 'fa-archive',
                        default: 1316,
                    },
                    {
                        path: 'camera.videoConfig.forceMax',
                        label: 'Force Max',
                        type: 'checkbox',
                        icon: 'fa-arrows-alt',
                        default: false,
                    },
                    {
                        path: 'camera.videoConfig.mapvideo',
                        label: 'Map Video',
                        type: 'text',
                        icon: 'fa-film',
                        default: '0:0',
                    },
                    {
                        path: 'camera.videoConfig.mapaudio',
                        label: 'Map Audio',
                        type: 'text',
                        icon: 'fa-volume-up',
                        default: '0:1',
                    },
                    {
                        path: 'camera.videoConfig.videoFilter',
                        label: 'Video Filter',
                        type: 'text',
                        icon: 'fa-filter',
                        default: 'scale=1280:720',
                    },
                    {
                        path: 'camera.videoConfig.encoderOptions',
                        label: 'Additional Command Line',
                        type: 'text',
                        icon: 'fa-terminal',
                        default: '-tune zerolatency',
                    },
                    {
                        path: 'camera.videoConfig.debug',
                        label: 'Debug',
                        type: 'checkbox',
                        icon: 'fa-bug',
                        default: false,
                    },
                    {
                        path: 'camera.videoConfig.debugReturn',
                        label: 'Debug Return Audio',
                        type: 'checkbox',
                        icon: 'fa-bug',
                        default: false,
                    },
                    {
                        path: 'camera.videoConfig.recording',
                        label: 'Recording',
                        type: 'checkbox',
                        icon: 'fa-video-camera',
                        default: true,
                    },
                    {
                        path: 'camera.videoConfig.prebuffer',
                        label: 'Prebuffer',
                        type: 'checkbox',
                        icon: 'fa-clock-o',
                        default: true,
                    },
                ],
            },
            {
                title: 'Camera Events',
                description:
                    'Expose HomeKit motion and doorbell helpers supported by Camera FFmpeg.',
                fields: [
                    {
                        path: 'camera.motion',
                        label: 'Motion Sensor',
                        type: 'checkbox',
                        icon: 'fa-bell',
                        default: false,
                    },
                    {
                        path: 'camera.doorbell',
                        label: 'Doorbell',
                        type: 'checkbox',
                        icon: 'fa-bell-o',
                        default: false,
                    },
                    {
                        path: 'camera.switches',
                        label: 'Trigger Switches',
                        type: 'checkbox',
                        icon: 'fa-toggle-on',
                        default: false,
                    },
                    {
                        path: 'camera.motionTimeout',
                        label: 'Motion Timeout',
                        type: 'number',
                        icon: 'fa-clock-o',
                        default: 1,
                    },
                    {
                        path: 'camera.motionDoorbell',
                        label: 'Motion Rings Doorbell',
                        type: 'checkbox',
                        icon: 'fa-bell',
                        default: false,
                    },
                ],
            },
            {
                title: 'Camera Identity',
                description:
                    'Optional HomeKit metadata overrides for this camera.',
                fields: [
                    {
                        path: 'camera.manufacturer',
                        label: 'Manufacturer',
                        type: 'text',
                        icon: 'fa-industry',
                    },
                    {
                        path: 'camera.model',
                        label: 'Model',
                        type: 'text',
                        icon: 'fa-cube',
                    },
                    {
                        path: 'camera.serialNumber',
                        label: 'Serial Number',
                        type: 'text',
                        icon: 'fa-barcode',
                    },
                    {
                        path: 'camera.firmwareRevision',
                        label: 'Firmware Revision',
                        type: 'text',
                        icon: 'fa-microchip',
                    },
                ],
            },
        ],
    },
}

export const homebridgeCameraFfmpegPluginFactory: NRCHKBPluginFactory<HomebridgeCameraFfmpegPluginConfig> =
    {
        attach: async (
            context: NRCHKBPluginAttachContext<HomebridgeCameraFfmpegPluginConfig>
        ): Promise<Service> => {
            const hap = await import('@homebridge/hap-nodejs')
            const module = (await importEsm(
                '@homebridge-plugins/homebridge-camera-ffmpeg/dist/streamingDelegate.js'
            )) as StreamingDelegateModule
            const delegate = new module.StreamingDelegate(
                createHomebridgeLogger(),
                getCameraConfig(context),
                createHomebridgeApiShim(),
                hap,
                context.accessory,
                context.config.videoProcessor
            )

            context.accessory.configureController(delegate.controller as never)

            const service = context.accessory.services.find(
                (candidate) =>
                    candidate.UUID === HAPService.CameraRTPStreamManagement.UUID
            )

            if (!service) {
                throw new Error(
                    'Homebridge Camera FFmpeg did not create a camera stream service.'
                )
            }

            return service
        },
    }

export const registerHomebridgeCameraFfmpegPlugin = () =>
    registerPlugin<HomebridgeCameraFfmpegPluginConfig>(
        homebridgeCameraFfmpegPluginMetadata,
        homebridgeCameraFfmpegPluginFactory
    )
