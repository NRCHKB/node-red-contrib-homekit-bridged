import * as fs from 'node:fs'
import * as os from 'node:os'
import {
    Characteristic,
    Perms,
    type SerializedService,
    Service,
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type express from 'express'
import type { NodeAPI } from 'node-red'
import { registerEmbeddedPlugins } from '../plugins/embedded'
import { listPlugins, registerNodeRedPlugins } from '../plugins/registry'

import EveCharacteristics from './hap/eve-app/EveCharacteristics'
import { migrateFlow, migrateNode } from './migration/NodeMigration'
import {
    createPairingQRCodeDataURL,
    formatPinCodeForPairing,
} from './PairingQRCode'
import { Storage } from './Storage'
import type CustomCharacteristicType from './types/CustomCharacteristicType'
import type HAPHostNodeType from './types/HAPHostNodeType'
import type HAPServiceConfigType from './types/HAPServiceConfigType'
import type HAPServiceNodeType from './types/HAPServiceNodeType'
import HapCategories from './types/hap-nodejs/HapCategories'
import type UniFiControllerConfigType from './types/UniFiControllerConfigType'
import type { UniFiControllerCredentials } from './types/UniFiControllerConfigType'
import {
    assertProtectControllerConfig,
    discoverProtectCameras,
} from './unifi/ProtectDiscovery'

const version = require('../../package.json').version.trim()

type AdvertiserRecommendation = {
    caveats: string[]
    detected: {
        avahiAvailable: boolean
        container: boolean
        dbusAvailable: boolean
        platform: NodeJS.Platform
        resolvedAvailable: boolean
    }
    reason: string
    recommended: 'avahi' | 'ciao' | 'resolved' | 'bonjour-hap'
    title: string
}

module.exports = (RED: NodeAPI) => {
    const log = logger('NRCHKB', 'API')
    const registeredCustomCharacteristicKeys = new Set<string>()

    const pathExists = (path: string) => {
        try {
            return fs.existsSync(path)
        } catch (_error) {
            return false
        }
    }

    const detectAdvertiserRecommendation = (): AdvertiserRecommendation => {
        const platform = os.platform()
        const container =
            pathExists('/.dockerenv') ||
            pathExists('/run/.containerenv') ||
            process.env.container !== undefined ||
            process.env.KUBERNETES_SERVICE_HOST !== undefined
        const dbusAvailable =
            pathExists('/run/dbus/system_bus_socket') ||
            pathExists('/var/run/dbus/system_bus_socket')
        const avahiAvailable =
            dbusAvailable &&
            (pathExists('/run/avahi-daemon/socket') ||
                pathExists('/var/run/avahi-daemon/socket'))
        const resolvedAvailable =
            dbusAvailable &&
            (pathExists('/run/systemd/resolve') ||
                pathExists('/run/systemd/resolve/io.systemd.Resolve'))

        const caveats: string[] = []

        if (platform === 'linux') {
            if (avahiAvailable) {
                if (container) {
                    caveats.push(
                        'Container detected. HomeKit discovery still depends on host networking and multicast visibility.'
                    )
                }

                return {
                    caveats,
                    detected: {
                        avahiAvailable,
                        container,
                        dbusAvailable,
                        platform,
                        resolvedAvailable,
                    },
                    reason: 'Linux host with Avahi and D-Bus available.',
                    recommended: 'avahi',
                    title: 'AVAHI recommended',
                }
            }

            if (container) {
                caveats.push(
                    'Container detected without usable host Avahi. Docker bridge networking can prevent mDNS discovery even with the recommended advertiser.'
                )
            } else if (resolvedAvailable) {
                caveats.push(
                    'systemd-resolved mDNS appears available, but RESOLVED is an advanced experimental choice. CIAO is safer unless you intentionally manage mDNS through systemd-resolved.'
                )
            } else {
                caveats.push(
                    'Install and run avahi-daemon with D-Bus if you prefer the Linux-native advertiser.'
                )
            }

            return {
                caveats,
                detected: {
                    avahiAvailable,
                    container,
                    dbusAvailable,
                    platform,
                    resolvedAvailable,
                },
                reason: container
                    ? 'Linux container without usable host Avahi detected.'
                    : 'Linux host without usable Avahi detected.',
                recommended: 'ciao',
                title: 'CIAO recommended',
            }
        }

        if (platform === 'darwin' || platform === 'win32') {
            return {
                caveats,
                detected: {
                    avahiAvailable,
                    container,
                    dbusAvailable,
                    platform,
                    resolvedAvailable,
                },
                reason:
                    platform === 'darwin'
                        ? 'macOS host detected.'
                        : 'Windows host detected.',
                recommended: 'ciao',
                title: 'CIAO recommended',
            }
        }

        caveats.push(
            'Host platform is uncommon for HomeKit. Verify multicast and mDNS behavior on this system.'
        )

        return {
            caveats,
            detected: {
                avahiAvailable,
                container,
                dbusAvailable,
                platform,
                resolvedAvailable,
            },
            reason: `Unsupported or uncommon host platform: ${platform}.`,
            recommended: 'ciao',
            title: 'CIAO recommended',
        }
    }

    // Service API
    const _initServiceAPI = () => {
        log.debug('Initialize Service API')

        type ServiceData = {
            [key: string]: Partial<SerializedService> & {
                nrchkbDisabledText?: string
                nrchkbHiddenInService2?: boolean
            }
        }

        // Service API response data
        const serviceData: ServiceData = {
            Camera: {
                displayName: 'Camera',
                constructorName: 'Camera',
            },
            BatteryService: {
                nrchkbDisabledText:
                    'BatteryService (deprecated, replaced by Battery)',
            },
            BridgeConfiguration: {
                nrchkbDisabledText: 'BridgeConfiguration (deprecated, unused)',
            },
            BridgingState: {
                nrchkbDisabledText: 'BridgingState (deprecated, unused)',
            },
            CameraControl: {
                nrchkbDisabledText:
                    'CameraControl (deprecated, replaced by Camera)',
                nrchkbHiddenInService2: true,
            },
            CameraEventRecordingManagement: {
                nrchkbDisabledText:
                    'CameraEventRecordingManagement (deprecated, replaced by CameraRecordingManagement)',
            },
            Relay: {
                nrchkbDisabledText:
                    'Relay (deprecated, replaced by CloudRelay)',
            },
            Slat: {
                nrchkbDisabledText: 'Slat (deprecated, replaced by Slats)',
            },
            TimeInformation: {
                nrchkbDisabledText: 'TimeInformation (deprecated, unused)',
            },
            TunneledBTLEAccessoryService: {
                nrchkbDisabledText:
                    'TunneledBTLEAccessoryService (deprecated, replaced by Tunnel)',
            },
        }

        Object.values(Service)
            .filter((service) => service.prototype instanceof Service)
            .map((service) => {
                const newService = Service.serialize(new service())
                newService.displayName = service.name
                return newService
            })
            .forEach((serialized) => {
                serviceData[serialized.displayName] = {
                    ...serviceData?.[serialized.displayName],
                    ...serialized,
                }
            })

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/nrchkb/service/types',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.setHeader('Content-Type', 'application/json')
                res.json(serviceData)
            }
        )

        RED.httpAdmin.get(
            '/nrchkb/plugins',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                registerNodeRedPlugins(RED)
                registerEmbeddedPlugins()
                res.setHeader('Content-Type', 'application/json')
                res.json(listPlugins().map((plugin) => plugin.metadata))
            }
        )

        RED.httpAdmin.get(
            '/nrchkb/unifi/controllers/:id/test',
            RED.auth.needsPermission('nrchkb.read'),
            async (req: express.Request, res: express.Response) => {
                const controller = RED.nodes.getNode(
                    req.params.id
                ) as UniFiControllerConfigType & {
                    credentials?: UniFiControllerCredentials
                }

                if (!controller) {
                    res.status(404).json({
                        error: 'UniFi controller config node was not found.',
                    })
                    return
                }

                try {
                    assertProtectControllerConfig(
                        controller,
                        controller.credentials ?? {}
                    )
                    await discoverProtectCameras(
                        controller,
                        controller.credentials ?? {}
                    )
                    res.json({ ok: true })
                } catch (error) {
                    res.status(400).json({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unable to connect to UniFi Protect.',
                    })
                }
            }
        )

        RED.httpAdmin.get(
            '/nrchkb/unifi/controllers/:id/protect/cameras',
            RED.auth.needsPermission('nrchkb.read'),
            async (req: express.Request, res: express.Response) => {
                const controller = RED.nodes.getNode(
                    req.params.id
                ) as UniFiControllerConfigType & {
                    credentials?: UniFiControllerCredentials
                }

                if (!controller) {
                    res.status(404).json({
                        error: 'UniFi controller config node was not found.',
                    })
                    return
                }

                try {
                    const cameras = await discoverProtectCameras(
                        controller,
                        controller.credentials ?? {}
                    )

                    res.json(
                        cameras.map((camera) => ({
                            value: camera.mac,
                            label: `${camera.name ?? camera.marketName ?? camera.mac} (${camera.mac})`,
                            id: camera.id,
                            mac: camera.mac,
                            state: camera.state,
                        }))
                    )
                } catch (error) {
                    res.status(400).json({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unable to discover UniFi Protect cameras.',
                    })
                }
            }
        )

        RED.httpAdmin.post(
            '/nrchkb/migration/node',
            RED.auth.needsPermission('nrchkb.write'),
            (req: express.Request, res: express.Response) => {
                if (!req.body || typeof req.body !== 'object') {
                    res.status(400).json({
                        error: 'Request body must be a Node-RED node object.',
                    })
                    return
                }

                res.setHeader('Content-Type', 'application/json')
                res.json(migrateNode(req.body))
            }
        )

        RED.httpAdmin.post(
            '/nrchkb/migration/flow',
            RED.auth.needsPermission('nrchkb.write'),
            (req: express.Request, res: express.Response) => {
                if (!Array.isArray(req.body)) {
                    res.status(400).json({
                        error: 'Request body must be an array of Node-RED nodes.',
                    })
                    return
                }

                res.setHeader('Content-Type', 'application/json')
                res.json(migrateFlow(req.body))
            }
        )
    }

    const stringifyVersion = (version: string) => {
        const releaseVersionRegex = /(\d+)\.(\d+)\.(\d+)/
        const devVersionRegex = /(\d+)\.(\d+)\.(\d+)-dev\.(\d+)/

        const releaseVersionFound = releaseVersionRegex.test(version)
        const devVersionFound = devVersionRegex.test(version)

        let xyzVersion = '0.0.0'

        if (devVersionFound) {
            try {
                const match = devVersionRegex.exec(version)

                if (match) {
                    xyzVersion = `0.${match[1]}${match[2]}${match[3]}.${match[4]}`
                } else {
                    log.debug('Could not match dev version')
                }
            } catch (e) {
                log.error(e as any)
            }
        } else if (releaseVersionFound) {
            try {
                const match = releaseVersionRegex.exec(version)

                if (match) {
                    xyzVersion = match[0]
                } else {
                    log.debug('Could not match release version')
                }
            } catch (e) {
                log.error(e as any)
            }
        } else {
            log.debug('Bad version format')
            xyzVersion = '0.0.0'
        }

        return xyzVersion
    }

    // NRCHKB Info API
    const _initNRCHKBInfoAPI = () => {
        log.debug('Initialize NRCHKB Info API')

        log.debug(`Running version: ${version}`)

        const xyzVersion = stringifyVersion(version)

        log.debug(`Evaluated as: ${xyzVersion}`)

        const experimental = process.env.NRCHKB_EXPERIMENTAL === 'true'

        log.debug(`Running experimental: ${experimental}`)

        // Retrieve NRCHKB version
        RED.httpAdmin.get(
            '/nrchkb/info',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.setHeader('Content-Type', 'application/json')
                res.json({
                    version: xyzVersion,
                    experimental,
                })
            }
        )
    }

    const _initAdvertiserRecommendationAPI = () => {
        log.debug('Initialize Advertiser Recommendation API')

        RED.httpAdmin.get(
            '/nrchkb/advertiser/recommendation',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.setHeader('Content-Type', 'application/json')
                res.json(detectAdvertiserRecommendation())
            }
        )
    }

    const getHostPairedState = (hostNode: HAPHostNodeType) => {
        const accessoryInfo = (
            hostNode.host as unknown as {
                _accessoryInfo?: { paired: () => boolean }
            }
        )._accessoryInfo

        if (accessoryInfo) {
            hostNode.paired = accessoryInfo.paired()
        }

        return !!hostNode.paired
    }

    const _initBridgePairingAPI = () => {
        log.debug('Initialize Bridge Pairing API')

        RED.httpAdmin.get(
            '/nrchkb/bridge/:id/pairing',
            RED.auth.needsPermission('nrchkb.read'),
            async (req: express.Request, res: express.Response) => {
                const hostId = req.params.id
                const node = RED.nodes.getNode(hostId) as
                    | HAPHostNodeType
                    | undefined

                res.setHeader('Content-Type', 'application/json')

                if (
                    !node ||
                    (node.type !== 'homekit-bridge' &&
                        node.type !== 'homekit-standalone')
                ) {
                    res.status(404).json({
                        error: 'Pairing host not found.',
                        paired: false,
                        published: false,
                    })
                    return
                }

                const bridgeName = node.config.bridgeName
                const pinCode = node.config.pinCode
                const formattedPinCode = formatPinCodeForPairing(pinCode)
                const paired = getHostPairedState(node)

                if (!node.published) {
                    res.status(409).json({
                        bridgeName,
                        formattedPinCode,
                        paired,
                        pinCode,
                        published: false,
                        status: 'unpublished',
                    })
                    return
                }

                if (paired) {
                    res.json({
                        bridgeName,
                        formattedPinCode,
                        paired: true,
                        pinCode,
                        published: true,
                        status: 'paired',
                    })
                    return
                }

                try {
                    const setupUri = node.host.setupURI()
                    const qrCodeDataUrl = await createPairingQRCodeDataURL(
                        setupUri,
                        pinCode
                    )

                    res.json({
                        bridgeName,
                        formattedPinCode,
                        paired: false,
                        pinCode,
                        published: true,
                        qrCodeDataUrl,
                        setupUri,
                        status: 'unpaired',
                    })
                } catch (error) {
                    log.error(
                        `Failed to generate pairing QR code for host ${hostId}: ${error}`
                    )
                    res.status(500).json({
                        bridgeName,
                        error: 'Failed to generate pairing QR code.',
                        formattedPinCode,
                        paired: false,
                        pinCode,
                        published: true,
                    })
                }
            }
        )
    }

    // NRCHKB Custom Characteristics API
    const _initNRCHKBCustomCharacteristicsAPI = async () => {
        const getCustomCharacteristics = async () => {
            try {
                const value = await Storage.loadCustomCharacteristics()

                log.trace('loadCustomCharacteristics()')
                log.trace(value)

                if (Array.isArray(value)) {
                    return value
                } else {
                    log.debug(
                        'customCharacteristics is not Array, returning empty value'
                    )
                    return EveCharacteristics
                }
            } catch (error) {
                log.error(
                    `Failed to get customCharacteristics in nrchkbStorage due to ${error}`
                )
                return EveCharacteristics
            }
        }

        const characteristicNameToKey = (name: string) => {
            return name.replace(/\s+/g, '')
        }

        const toNumber = (value: any, optional = undefined) => {
            const num = Number(value)
            if (Number.isNaN(num)) {
                return optional
            } else return num
        }

        const rebindCharacteristicListeners = (
            characteristic: Characteristic,
            serviceNode: HAPServiceNodeType
        ) => {
            characteristic.removeListener(
                'get',
                serviceNode.onCharacteristicGet
            )
            characteristic.removeListener(
                'set',
                serviceNode.onCharacteristicSet
            )
            characteristic.removeListener(
                'change',
                serviceNode.onCharacteristicChange
            )

            characteristic.on('get', serviceNode.onCharacteristicGet)
            characteristic.on('set', serviceNode.onCharacteristicSet)
            characteristic.on('change', serviceNode.onCharacteristicChange)
        }

        const refreshCustomCharacteristics = (
            customCharacteristics: CustomCharacteristicType[]
        ) => {
            log.debug('Refreshing Custom Characteristics')

            const customCharacteristicKeys = new Set<string>()

            customCharacteristics.forEach(({ name, UUID, ...props }) => {
                if (UUID && name) {
                    const key = characteristicNameToKey(name)

                    log.debug(
                        `Adding Custom Characteristic ${name} using key ${key}`
                    )

                    if (customCharacteristicKeys.has(key)) {
                        log.error(
                            `Cannot add ${name}. Another Custom Characteristic already defined using key ${key}`
                        )
                        return
                    }

                    const validatedProps = { ...props }
                    if (validatedProps.validValues?.length === 0) {
                        validatedProps.validValues = undefined
                    }
                    if (validatedProps.validValueRanges?.length) {
                        const [minRange, maxRange] =
                            validatedProps.validValueRanges

                        if (minRange === undefined || maxRange === undefined) {
                            validatedProps.validValueRanges = undefined
                        } else {
                            const minRangeNumber = Number(minRange)
                            const maxRangeNumber = Number(maxRange)

                            if (
                                Number.isNaN(minRangeNumber) ||
                                Number.isNaN(maxRangeNumber)
                            ) {
                                validatedProps.validValueRanges = undefined
                            } else {
                                validatedProps.validValueRanges = [
                                    minRangeNumber,
                                    maxRangeNumber,
                                ]
                            }
                        }
                    }
                    if (validatedProps.adminOnlyAccess?.length === 0) {
                        validatedProps.adminOnlyAccess = undefined
                    }
                    if (validatedProps.minValue !== undefined) {
                        validatedProps.minValue = toNumber(
                            validatedProps.minValue
                        )
                    }
                    if (validatedProps.maxValue !== undefined) {
                        validatedProps.maxValue = toNumber(
                            validatedProps.maxValue
                        )
                    }
                    if (validatedProps.minStep !== undefined) {
                        validatedProps.minStep = toNumber(
                            validatedProps.minStep
                        )
                    }

                    class CustomCharacteristic extends Characteristic {
                        static readonly UUID: string = UUID!

                        constructor() {
                            super(name!, CustomCharacteristic.UUID, {
                                ...validatedProps,
                                perms: validatedProps.perms ?? [
                                    Perms.PAIRED_READ,
                                    Perms.PAIRED_WRITE,
                                    Perms.NOTIFY,
                                ],
                            })

                            this.value = this.getDefaultValue()
                        }
                    }

                    Object.defineProperty(CustomCharacteristic, 'name', {
                        value: key,
                        configurable: true,
                    })
                    Object.defineProperty(Characteristic, key, {
                        value: CustomCharacteristic,
                        configurable: true,
                    })

                    customCharacteristicKeys.add(key)
                }
            })

            registeredCustomCharacteristicKeys.forEach((key) => {
                if (customCharacteristicKeys.has(key)) {
                    return
                }

                log.debug(`Removing stale Custom Characteristic ${key}`)
                delete (Characteristic as unknown as Record<string, unknown>)[
                    key
                ]
                registeredCustomCharacteristicKeys.delete(key)
            })

            customCharacteristicKeys.forEach((key) => {
                registeredCustomCharacteristicKeys.add(key)
            })

            new Promise((resolve) => {
                const isRedInitialized = () => {
                    try {
                        RED.nodes.eachNode(() => {
                            return
                        })
                        resolve(true)
                    } catch (_) {
                        log.debug('Waiting for RED to be initialized')
                        setTimeout(isRedInitialized, 1000)
                    }
                }

                isRedInitialized()
            }).then(() => {
                RED.nodes.eachNode((node) => {
                    if (
                        node.type === 'homekit-service' ||
                        node.type === 'homekit-service2'
                    ) {
                        const serviceNodeConfig = node as HAPServiceConfigType

                        const serviceNode = RED.nodes.getNode(
                            serviceNodeConfig.id
                        ) as HAPServiceNodeType

                        if (
                            serviceNode?.characteristicProperties &&
                            serviceNode.service
                        ) {
                            for (const key in serviceNode.characteristicProperties) {
                                if (customCharacteristicKeys.has(key)) {
                                    const characteristic = serviceNode.service
                                        // @ts-expect-error
                                        .getCharacteristic(Characteristic[key])
                                        .setProps(
                                            serviceNode
                                                .characteristicProperties[key]
                                        )
                                    serviceNode.supported.add(key)
                                    rebindCharacteristicListeners(
                                        characteristic,
                                        serviceNode
                                    )
                                }
                            }
                        }
                    }
                })
            })
        }

        log.debug('Initialize NRCHKBCustomCharacteristicsAPI')

        getCustomCharacteristics().then((value) =>
            refreshCustomCharacteristics(value)
        )

        // Retrieve NRCHKB version
        RED.httpAdmin.get(
            '/nrchkb/config',
            RED.auth.needsPermission('nrchkb.read'),
            async (_req: express.Request, res: express.Response) => {
                res.setHeader('Content-Type', 'application/json')
                res.json({
                    customCharacteristics: await getCustomCharacteristics(),
                })
            }
        )

        // Change NRCHKB version
        RED.httpAdmin.post(
            '/nrchkb/config',
            RED.auth.needsPermission('nrchkb.write'),
            async (req: express.Request, res: express.Response) => {
                const customCharacteristics: CustomCharacteristicType[] =
                    req.body.customCharacteristics || EveCharacteristics

                Storage.saveCustomCharacteristics(customCharacteristics)
                    .then(() => {
                        res.sendStatus(200)
                        refreshCustomCharacteristics(customCharacteristics)
                    })
                    .catch((error) => {
                        log.error(error)
                        res.sendStatus(500)
                    })
            }
        )
    }

    // Accessory API
    const _initAccessoryAPI = () => {
        log.debug('Initialize Accessory API')

        // Accessory Categories API response data
        const accessoryCategoriesData: {
            [key: number]: string
        } = {}

        // Prepare Accessory data once
        Object.keys(HapCategories)
            .sort()
            .filter((x) => parseInt(x, 10) >= 0)
            .forEach((key) => {
                const keyNumber = key as unknown as number
                accessoryCategoriesData[keyNumber] = HapCategories[keyNumber]
            })

        // Retrieve Accessory Types
        RED.httpAdmin.get(
            '/nrchkb/accessory/categories',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.setHeader('Content-Type', 'application/json')
                res.json(accessoryCategoriesData)
            }
        )
    }

    const init = () => {
        _initServiceAPI()
        _initNRCHKBInfoAPI()
        _initAdvertiserRecommendationAPI()
        _initBridgePairingAPI()
        _initAccessoryAPI()

        _initNRCHKBCustomCharacteristicsAPI().then()
    }

    return {
        detectAdvertiserRecommendation,
        init,
        stringifyVersion,
    }
}
