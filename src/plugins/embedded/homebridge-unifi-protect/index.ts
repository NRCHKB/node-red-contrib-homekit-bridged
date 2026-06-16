import { Service as HAPService } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type UniFiControllerConfigType from '../../../lib/types/UniFiControllerConfigType'
import type { UniFiControllerCredentials } from '../../../lib/types/UniFiControllerConfigType'
import type {
    NRCHKBPluginAttachContext,
    NRCHKBPluginConfigEntry,
    NRCHKBPluginFactory,
    NRCHKBPluginMetadata,
} from '../../registry'
import { normalizePluginId, registerPlugin } from '../../registry'

export const HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_NAME = 'homebridge-unifi-protect'
export const HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID = normalizePluginId(
    'node-red-contrib-homekit-bridged',
    HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_NAME
)

type PackageJson = {
    version?: string
    license?: string
    author?: { name?: string } | string
    contributors?: Array<{ name?: string } | string>
}

export type HomebridgeUniFiProtectPluginConfig = {
    controller?: string
    camera?: string
    videoProcessor?: string
    verboseFfmpeg?: boolean
    audio?: boolean
    twoWayAudio?: boolean
    twoWayAudioDirect?: boolean
    hksv?: boolean
    hksvRecordingSwitch?: boolean
    motionSwitch?: boolean
    motionTrigger?: boolean
    occupancySensor?: boolean
    doorbellTrigger?: boolean
    featureOptions?: string
}

type HomebridgeApiShim = {
    hap: typeof import('@homebridge/hap-nodejs')
    platformAccessory: new (displayName: string, uuid: string) => unknown
    on: (event: string, handler: () => void) => void
    registerPlatformAccessories: (
        pluginName: string,
        platformName: string,
        accessories: unknown[]
    ) => void
    unregisterPlatformAccessories: (
        pluginName: string,
        platformName: string,
        accessories: unknown[]
    ) => void
    updatePlatformAccessories: (accessories: unknown[]) => void
    publishExternalAccessories: (
        pluginName: string,
        accessories: unknown[]
    ) => void
}

type HomebridgePlatformAccessoryShape = {
    _associatedHAPAccessory?: {
        bridged?: boolean
    }
}

type ProtectPlatformModule = {
    ProtectPlatform: new (
        log: unknown,
        config: Record<string, unknown>,
        api: HomebridgeApiShim
    ) => {
        accessories: unknown[]
        controllers: Array<{
            addHomeKitDevice: (device: ProtectDevice) => boolean
            addProtectDevice: (
                accessory: unknown,
                device: ProtectDevice
            ) => unknown
            configuredDevices: Map<string, { cleanup?: () => void }>
            disconnect: () => void
            events?: { emit: (event: string, payload: unknown) => void }
            ufp?: { mac?: string }
            ufpApi?: { logout?: () => void }
        }>
        codecSupport?: { probe: () => Promise<boolean> }
        launchControllers?: () => Promise<void>
        log?: { error: (message: string, ...parameters: unknown[]) => void }
    }
}

type ProtectDevice = {
    id?: string
    mac?: string
    name?: string
    marketName?: string
    modelKey?: string
}

const requirePackageJson = (packageName: string): PackageJson => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${packageName}/package.json`) as PackageJson
    } catch (_) {
        return {}
    }
}

const upstreamPackage = requirePackageJson('homebridge-unifi-protect')

const toName = (value: { name?: string } | string | undefined): string =>
    typeof value === 'string' ? value : (value?.name ?? '')

const upstreamAuthor = toName(upstreamPackage.author)
const upstreamContributors =
    upstreamPackage.contributors?.map(toName).filter(Boolean) ?? []

const importEsm = (specifier: string): Promise<unknown> => {
    const importer = new Function('specifier', 'return import(specifier)')
    return importer(specifier) as Promise<unknown>
}

export const ensureHomebridgePlatformAccessoryShape = (
    accessory: unknown,
    bridged: boolean
): void => {
    const platformAccessory = accessory as HomebridgePlatformAccessoryShape

    platformAccessory._associatedHAPAccessory ??= {}
    platformAccessory._associatedHAPAccessory.bridged = bridged
}

const createHomebridgeLogger = () => {
    const log = logger('NRCHKB', 'HomebridgeUniFiProtect')

    const write =
        (level: 'debug' | 'info' | 'warn' | 'error') =>
        (message: string, ...parameters: unknown[]) => {
            const suffix = parameters.length ? ` ${parameters.join(' ')}` : ''
            const text = `${message}${suffix}`
            if (level === 'error') {
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

const getControllerNode = (
    context: NRCHKBPluginAttachContext<HomebridgeUniFiProtectPluginConfig>
): UniFiControllerConfigType & { credentials?: UniFiControllerCredentials } => {
    const controllerId = context.config.controller
    if (!controllerId || !context.RED) {
        throw new Error('UniFi Protect controller is not configured.')
    }

    const controller = context.RED.nodes.getNode(controllerId) as
        | (UniFiControllerConfigType & {
              credentials?: UniFiControllerCredentials
          })
        | undefined

    if (!controller) {
        throw new Error(`UniFi controller "${controllerId}" was not found.`)
    }

    if ((controller.application ?? 'protect') !== 'protect') {
        throw new Error(
            'Selected UniFi controller is not a Protect controller.'
        )
    }

    if (
        !controller.address ||
        !controller.credentials?.username ||
        !controller.credentials.password
    ) {
        throw new Error(
            'UniFi Protect controller address, username, and password are required.'
        )
    }

    return controller
}

const getSelectedCamera = (
    context: NRCHKBPluginAttachContext<HomebridgeUniFiProtectPluginConfig>
): string => {
    const camera = context.config.camera?.trim()

    if (!camera) {
        throw new Error('Select a UniFi Protect camera before deploying.')
    }

    return camera
}

const splitFeatureOptions = (value?: string): string[] =>
    (value ?? '')
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)

const buildFeatureOptions = (
    config: HomebridgeUniFiProtectPluginConfig
): string[] => {
    const options = splitFeatureOptions(config.featureOptions)

    if (config.audio === false) {
        options.push('Disable.Audio')
    }
    if (config.twoWayAudio === false) {
        options.push('Disable.Audio.TwoWay')
    }
    if (config.twoWayAudioDirect === true) {
        options.push('Enable.Audio.TwoWay.Direct')
    }
    if (config.hksv === false) {
        options.push('Disable.Video.HKSV')
    }
    if (config.hksvRecordingSwitch === true) {
        options.push('Enable.Video.HKSV.Recording.Switch')
    }
    if (config.motionSwitch === true) {
        options.push('Enable.Motion.Switch')
    }
    if (config.motionTrigger === true) {
        options.push('Enable.Motion.Trigger')
    }
    if (config.occupancySensor === true) {
        options.push('Enable.Motion.OccupancySensor')
    }
    if (config.doorbellTrigger === true) {
        options.push('Enable.Doorbell.Trigger')
    }

    return options
}

const createHomebridgeApiShim = async (
    context: NRCHKBPluginAttachContext<HomebridgeUniFiProtectPluginConfig>
): Promise<{
    api: HomebridgeApiShim
    emit: (event: string) => void
}> => {
    const hap = await import('@homebridge/hap-nodejs')
    const handlers = new Map<string, Array<() => void>>()
    const PlatformAccessoryShim = class extends (hap.Accessory as new (
        displayName: string,
        uuid: string
    ) => { context?: Record<string, unknown> }) {
        constructor(displayName: string, uuid: string) {
            super(displayName, uuid)
            this.context ??= {}
            ensureHomebridgePlatformAccessoryShape(this, true)
        }
    }

    const api = {
        hap,
        platformAccessory: PlatformAccessoryShim as never,
        on: (event: string, handler: () => void) => {
            const eventHandlers = handlers.get(event) ?? []
            eventHandlers.push(handler)
            handlers.set(event, eventHandlers)
        },
        registerPlatformAccessories: (
            _pluginName: string,
            _platformName: string,
            accessories: unknown[]
        ) => {
            accessories.forEach((accessory) => {
                ensureHomebridgePlatformAccessoryShape(accessory, true)
                if (!context.accessory.services.includes(accessory as never)) {
                    // Scoped service plugins attach to the existing NRCHKB
                    // accessory. Additional HBUP-created accessories are kept
                    // in HBUP memory but are not published by NRCHKB v1.
                }
            })
        },
        unregisterPlatformAccessories: () => undefined,
        updatePlatformAccessories: () => undefined,
        publishExternalAccessories: (
            _pluginName: string,
            accessories: unknown[]
        ) => {
            accessories.forEach((accessory) => {
                ensureHomebridgePlatformAccessoryShape(accessory, false)
            })
        },
    } satisfies HomebridgeApiShim

    return {
        api,
        emit: (event: string) => {
            ;(handlers.get(event) ?? []).forEach((handler) => handler())
        },
    }
}

const configureSelectedCameraOnly = (
    context: NRCHKBPluginAttachContext<HomebridgeUniFiProtectPluginConfig>,
    platform: InstanceType<ProtectPlatformModule['ProtectPlatform']>
): void => {
    const selectedCamera = getSelectedCamera(context).toLowerCase()

    context.accessory.context ??= {}
    ensureHomebridgePlatformAccessoryShape(context.accessory, true)
    platform.accessories = [context.accessory]

    platform.controllers.forEach((controller) => {
        controller.addHomeKitDevice = (device: ProtectDevice): boolean => {
            const deviceMac = device.mac?.toLowerCase()
            const deviceId = device.id?.toLowerCase()

            if (
                !selectedCamera ||
                (selectedCamera !== deviceMac && selectedCamera !== deviceId)
            ) {
                return false
            }

            context.accessory.context ??= {}
            context.accessory.context.mac = device.mac
            if (controller.ufp?.mac) {
                context.accessory.context.nvr = controller.ufp.mac
            }

            const accessoryUuid = context.accessory.UUID
            if (!controller.configuredDevices.has(accessoryUuid)) {
                controller.addProtectDevice(context.accessory, device)
                return true
            }

            controller.events?.emit('updateEvent', {
                header: {
                    action: 'update',
                    hbupBootstrap: true,
                    id: device.id,
                    modelKey: device.modelKey,
                },
                payload: device,
            })
            return true
        }
    })
}

const guardPlatformLaunch = (
    platform: InstanceType<ProtectPlatformModule['ProtectPlatform']>
): void => {
    platform.launchControllers = async () => {
        try {
            if (
                platform.codecSupport &&
                !(await platform.codecSupport.probe())
            ) {
                platform.log?.error(
                    'Homebridge UniFi Protect requires a working FFmpeg executable.'
                )
                return
            }

            await Promise.all(
                platform.controllers.map(async (controller) => {
                    try {
                        const login = (
                            controller as unknown as {
                                login?: () => Promise<void>
                            }
                        ).login
                        await login?.call(controller)
                    } catch (error) {
                        platform.log?.error(
                            'Unable to start UniFi Protect controller: %s',
                            error
                        )
                    }
                })
            )
        } catch (error) {
            platform.log?.error('Unable to launch UniFi Protect: %s', error)
        }
    }
}

export const createHomebridgeUniFiProtectCleanup = (
    platform: Pick<
        InstanceType<ProtectPlatformModule['ProtectPlatform']>,
        'controllers'
    >,
    emit: (event: string) => void
): (() => void) => {
    let closed = false

    return () => {
        if (closed) {
            return
        }

        closed = true
        emit('shutdown')

        platform.controllers.forEach((controller) => {
            controller.configuredDevices.forEach((device) => {
                try {
                    device.cleanup?.()
                } catch (_) {}
            })

            try {
                controller.disconnect()
            } catch (_) {}

            try {
                controller.ufpApi?.logout?.()
            } catch (_) {}
        })
    }
}

export const homebridgeUniFiProtectPluginMetadata: NRCHKBPluginMetadata = {
    id: HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID,
    packageName: 'node-red-contrib-homekit-bridged',
    pluginName: HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_NAME,
    displayName: 'Homebridge UniFi Protect',
    author: 'NRCHKB',
    version: '1.0.0',
    description:
        'Adds a selected UniFi Protect camera using Homebridge UniFi Protect runtime behavior.',
    attachment: 'config-node',
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
    serviceNames: ['Camera'],
    multipleInstances: false,
    upstream: {
        packageName: 'homebridge-unifi-protect',
        packageVersion: upstreamPackage.version,
        projectName: 'Homebridge UniFi Protect',
        repoUrl: 'https://github.com/hjdhjd/homebridge-unifi-protect',
        license: upstreamPackage.license,
        authors: upstreamAuthor ? [upstreamAuthor] : [],
        contributors: upstreamContributors,
        disclaimer:
            'Original authors and contributors are credited for the upstream Homebridge plugin. NRCHKB owns and supports this embedded integration.',
    },
    editor: {
        defaultConfig: {
            controller: '',
            camera: '',
            videoProcessor: '',
            verboseFfmpeg: false,
            audio: true,
            twoWayAudio: true,
            twoWayAudioDirect: false,
            hksv: true,
            hksvRecordingSwitch: false,
            motionSwitch: false,
            motionTrigger: false,
            occupancySensor: false,
            doorbellTrigger: false,
            featureOptions: '',
        },
        sections: [
            {
                title: 'Controller',
                fields: [
                    {
                        path: 'controller',
                        label: 'UniFi Controller',
                        type: 'config-node',
                        icon: 'fa-server',
                        configNodeType: 'homekit-unifi-controller',
                    },
                ],
            },
            {
                title: 'Camera',
                fields: [
                    {
                        path: 'camera',
                        label: 'Camera',
                        type: 'dynamic-select',
                        icon: 'fa-video-camera',
                        optionsUrl:
                            'nrchkb/unifi/controllers/{controller}/protect/cameras',
                        optionsDependsOn: 'controller',
                    },
                ],
            },
            {
                title: 'Streaming & Audio',
                fields: [
                    {
                        path: 'videoProcessor',
                        label: 'FFmpeg Location',
                        type: 'text',
                        icon: 'fa-terminal',
                    },
                    {
                        path: 'verboseFfmpeg',
                        label: 'Verbose FFmpeg',
                        type: 'checkbox',
                        icon: 'fa-bug',
                        default: false,
                    },
                    {
                        path: 'audio',
                        label: 'Audio',
                        type: 'checkbox',
                        icon: 'fa-headphones',
                        default: true,
                    },
                    {
                        path: 'twoWayAudio',
                        label: 'Two-Way Audio',
                        type: 'checkbox',
                        icon: 'fa-microphone',
                        default: true,
                    },
                    {
                        path: 'twoWayAudioDirect',
                        label: 'Direct Two-Way Audio',
                        type: 'checkbox',
                        icon: 'fa-microphone',
                        default: false,
                    },
                ],
            },
            {
                title: 'Recording / HKSV',
                fields: [
                    {
                        path: 'hksv',
                        label: 'HomeKit Secure Video',
                        type: 'checkbox',
                        icon: 'fa-video-camera',
                        default: true,
                    },
                    {
                        path: 'hksvRecordingSwitch',
                        label: 'Recording Switch',
                        type: 'checkbox',
                        icon: 'fa-toggle-on',
                        default: false,
                    },
                ],
            },
            {
                title: 'Advanced',
                fields: [
                    {
                        path: 'motionSwitch',
                        label: 'Motion Switch',
                        type: 'checkbox',
                        icon: 'fa-toggle-on',
                        default: false,
                    },
                    {
                        path: 'motionTrigger',
                        label: 'Motion Trigger',
                        type: 'checkbox',
                        icon: 'fa-bell',
                        default: false,
                    },
                    {
                        path: 'occupancySensor',
                        label: 'Occupancy Sensor',
                        type: 'checkbox',
                        icon: 'fa-street-view',
                        default: false,
                    },
                    {
                        path: 'doorbellTrigger',
                        label: 'Doorbell Trigger',
                        type: 'checkbox',
                        icon: 'fa-bell-o',
                        default: false,
                    },
                    {
                        path: 'featureOptions',
                        label: 'Feature Options',
                        type: 'textarea',
                        icon: 'fa-list',
                        placeholder:
                            'One Homebridge UniFi Protect feature option per line',
                    },
                ],
            },
        ],
    },
}

export const attachHomebridgeUniFiProtectPlugin = async (
    context: NRCHKBPluginAttachContext<HomebridgeUniFiProtectPluginConfig>
) => {
    getSelectedCamera(context)
    const controller = getControllerNode(context)
    const module = (await importEsm(
        'homebridge-unifi-protect/dist/protect-platform.js'
    )) as ProtectPlatformModule
    const { api, emit } = await createHomebridgeApiShim(context)

    const hbupConfig = {
        controllers: [
            {
                address: controller.address,
                username: controller.credentials?.username,
                password: controller.credentials?.password,
                name: controller.name,
                overrideAddress: controller.overrideAddress,
            },
        ],
        options: buildFeatureOptions(context.config),
        verboseFfmpeg: context.config.verboseFfmpeg === true,
        videoProcessor: context.config.videoProcessor || undefined,
    }

    const platform = new module.ProtectPlatform(
        createHomebridgeLogger(),
        hbupConfig,
        api
    )

    configureSelectedCameraOnly(context, platform)
    guardPlatformLaunch(platform)
    emit('didFinishLaunching')

    context.node?.on(
        'close',
        createHomebridgeUniFiProtectCleanup(platform, emit)
    )

    return (
        context.accessory.getService(HAPService.CameraRTPStreamManagement) ??
        context.accessory.addService(
            HAPService.CameraRTPStreamManagement,
            context.serviceInformation.name
        )
    )
}

export const homebridgeUniFiProtectPluginFactory: NRCHKBPluginFactory<HomebridgeUniFiProtectPluginConfig> =
    {
        attach: attachHomebridgeUniFiProtectPlugin,
    }

export const registerHomebridgeUniFiProtectPlugin = () =>
    registerPlugin<HomebridgeUniFiProtectPluginConfig>(
        homebridgeUniFiProtectPluginMetadata,
        homebridgeUniFiProtectPluginFactory
    )

export const createHomebridgeUniFiProtectPluginEntry = (
    config: Partial<HomebridgeUniFiProtectPluginConfig>
): NRCHKBPluginConfigEntry<HomebridgeUniFiProtectPluginConfig> => ({
    id: HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID,
    automatic: false,
    modified: true,
    config: {
        ...config,
    },
})
