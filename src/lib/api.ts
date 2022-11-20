import { logger } from '@nrchkb/logger'
import express from 'express'
import { Characteristic, Perms, SerializedService, Service } from 'hap-nodejs'
import { NodeAPI } from 'node-red'

import { Storage } from './Storage'
import CustomCharacteristicType from './types/CustomCharacteristicType'
import HapCategories from './types/HapCategories'
import HAPServiceConfigType from './types/HAPServiceConfigType'
import HAPServiceNodeType from './types/HAPServiceNodeType'

const version = require('../../package.json').version.trim()

module.exports = function (RED: NodeAPI) {
    const log = logger('NRCHKB', 'API')

    // Service API
    const _initServiceAPI = () => {
        log.debug('Initialize Service API')

        type ServiceData = {
            [key: string]: Partial<SerializedService> & {
                nrchkbDisabledText?: string
            }
        }

        // Service API response data
        const serviceData: ServiceData = {
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
            // CameraControl: {}, // This service is deprecated but used by nrchkb to link rtsp logic
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
                res.json(serviceData)
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
                console.error(e)
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
                console.error(e)
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
                res.json({
                    version: xyzVersion,
                    experimental,
                })
            }
        )
    }

    // NRCHKB Custom Characteristics API
    const _initNRCHKBCustomCharacteristicsAPI = async () => {
        const getCustomCharacteristics = () => {
            return Storage.loadCustomCharacteristics()
                .then((value) => {
                    log.trace('loadCustomCharacteristics()')
                    log.trace(value)

                    if (Array.isArray(value)) {
                        return value
                    } else {
                        log.debug(
                            'customCharacteristics is not Array, returning empty value'
                        )
                        return []
                    }
                })
                .catch((error) => {
                    log.error(
                        `Failed to get customCharacteristics in nrchkbStorage due to ${error}`
                    )
                    return []
                })
        }

        const characteristicNameToKey = (name: string) => {
            return name.replace(' ', '')
        }

        const toNumber = (value: any, optional = undefined) => {
            const num = Number(value)
            if (isNaN(num)) {
                return optional
            } else return num
        }

        const refreshCustomCharacteristics = (
            customCharacteristics: CustomCharacteristicType[]
        ) => {
            log.debug('Refreshing Custom Characteristics')

            const customCharacteristicKeys: string[] = []

            customCharacteristics.forEach(({ name, UUID, ...props }) => {
                if (!!UUID && !!name) {
                    const key = characteristicNameToKey(name)

                    log.debug(
                        `Adding Custom Characteristic ${name} using key ${key}`
                    )

                    if (customCharacteristicKeys.includes(key)) {
                        log.error(
                            `Cannot add ${name}. Another Custom Characteristic already defined using key ${key}`
                        )
                        return
                    }

                    const validatedProps = props
                    if (validatedProps.validValues?.length === 0) {
                        validatedProps.validValues = undefined
                    }
                    if (
                        !validatedProps.validValueRanges?.[0] ||
                        !validatedProps.validValueRanges?.[1]
                    ) {
                        validatedProps.validValueRanges = undefined
                    }
                    if (validatedProps.adminOnlyAccess?.length === 0) {
                        validatedProps.adminOnlyAccess = undefined
                    }
                    if (validatedProps.minValue) {
                        validatedProps.minValue = toNumber(
                            validatedProps.minValue
                        )
                    }
                    if (validatedProps.maxValue) {
                        validatedProps.maxValue = toNumber(
                            validatedProps.maxValue
                        )
                    }
                    if (validatedProps.minStep) {
                        validatedProps.minStep = toNumber(
                            validatedProps.minStep
                        )
                    }

                    class CustomCharacteristic extends Characteristic {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        static readonly UUID: string = UUID!

                        constructor() {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

                    customCharacteristicKeys.push(key)
                }
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
                            serviceNode &&
                            serviceNode.characteristicProperties &&
                            serviceNode.service
                        ) {
                            for (const key in serviceNode.characteristicProperties) {
                                if (customCharacteristicKeys.includes(key)) {
                                    const characteristic = serviceNode.service
                                        // @ts-ignore
                                        .getCharacteristic(Characteristic[key])
                                        .setProps(
                                            serviceNode
                                                .characteristicProperties[key]
                                        )
                                    serviceNode.supported.push(key)

                                    characteristic.on(
                                        'get',
                                        serviceNode.onCharacteristicGet
                                    )
                                    characteristic.on(
                                        'set',
                                        serviceNode.onCharacteristicSet
                                    )
                                    characteristic.on(
                                        'change',
                                        serviceNode.onCharacteristicChange
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
                    req.body.customCharacteristics || []

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
    const _initAccessoryAPI = function () {
        log.debug('Initialize Accessory API')

        // Accessory Categories API response data
        const accessoryCategoriesData: {
            [key: number]: string
        } = {}

        // Prepare Accessory data once
        Object.keys(HapCategories)
            .sort()
            .filter((x) => parseInt(x) >= 0)
            .forEach((key) => {
                const keyNumber = key as unknown as number
                accessoryCategoriesData[keyNumber] = HapCategories[keyNumber]
            })

        // Retrieve Accessory Types
        RED.httpAdmin.get(
            '/nrchkb/accessory/categories',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(accessoryCategoriesData)
            }
        )
    }

    const init = () => {
        _initServiceAPI()
        _initNRCHKBInfoAPI()
        _initAccessoryAPI()

        // Experimental feature
        if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
            _initNRCHKBCustomCharacteristicsAPI().then()
        }
    }

    return {
        init,
        stringifyVersion,
    }
}
