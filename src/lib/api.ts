import { NodeAPI } from 'node-red'
import express from 'express'
import HapCategories from './types/HapCategories'
import { Characteristic, Perms, SerializedService, Service } from 'hap-nodejs'
import storage from 'node-persist'
import CustomCharacteristicType from './types/CustomCharacteristicType'
import HAPServiceNodeType from './types/HAPServiceNodeType'
import HAPServiceConfigType from './types/HAPServiceConfigType'

const version = require('../../package.json').version.trim()

module.exports = function (RED: NodeAPI) {
    const debug = require('debug')('NRCHKB:api')

    // Service API response data
    const serviceData: {
        [key: string]: SerializedService
    } = {}

    // Service API
    const _initServiceAPI = () => {
        debug('Initialize ServiceAPI')

        Object.values(Service)
            .filter((service) => service.prototype instanceof Service)
            .map((service) => {
                const newService = Service.serialize(new service())
                newService.displayName = service.name
                return newService
            })
            .sort((a, b) =>
                a.displayName < b.displayName
                    ? -1
                    : a.displayName > b.displayName
                    ? 1
                    : 0
            )
            .forEach(
                (serialized) =>
                    (serviceData[serialized.displayName] = serialized)
            )

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/nrchkb/service/types',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(serviceData)
            }
        )
    }

    // NRCHKB Version API
    const _initNRCHKBVersionAPI = () => {
        debug('Initialize NRCHKBVersionAPI')

        debug('Running version:', version)

        const releaseVersionRegex = /(\d+)\.(\d+)\.(\d+)/
        const devVersionRegex = /(\d+)\.(\d+)\.(\d+)-dev\.(\d+)/

        const releaseVersionFound = releaseVersionRegex.test(version)
        const devVersionFound = devVersionRegex.test(version)

        let xyzVersion = '0.0.0'

        if (devVersionFound) {
            try {
                const match = devVersionRegex.exec(version)

                if (match) {
                    xyzVersion =
                        0 +
                        '.' +
                        match[1] +
                        match[2] +
                        match[3] +
                        '.' +
                        match[4]
                } else {
                    debug('Could not match dev version')
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
                    debug('Could not match release version')
                }
            } catch (e) {
                console.error(e)
            }
        } else {
            debug('Bad version format')
            xyzVersion = '0.0.0'
        }

        debug('Evaluated as:', xyzVersion)

        // Retrieve NRCHKB version
        RED.httpAdmin.get(
            '/nrchkb/version',
            RED.auth.needsPermission('nrchkb.read'),
            (_req: express.Request, res: express.Response) => {
                res.json({
                    version: xyzVersion,
                })
            }
        )
    }

    // NRCHKB Custom Characteristics API
    const _initNRCHKBCustomCharacteristicsAPI = async () => {
        const getCustomCharacteristics = () => {
            return storage
                .get('customCharacteristics')
                .then((value) => {
                    if (Array.isArray(value)) {
                        return value
                    } else {
                        debug(
                            'customCharacteristics is not Array, returning empty value'
                        )
                        return []
                    }
                })
                .catch((error) => {
                    debug(
                        'Failed to get customCharacteristics in nrchkbStorage'
                    )
                    console.error(error)
                    return []
                })
        }

        const characteristicNameToKey = (name: string) => {
            return name.replace(' ', '')
        }

        const refreshCustomCharacteristics = (
            customCharacteristics: CustomCharacteristicType[]
        ) => {
            debug('Refreshing Custom Characteristics')

            const customCharacteristicKeys: string[] = []

            customCharacteristics.forEach(({ name, UUID, ...props }) => {
                if (!!UUID && !!name) {
                    const key = characteristicNameToKey(name)

                    debug(`Adding Custom Characteristic ${key}`)

                    class CustomCharacteristic extends Characteristic {
                        static readonly UUID: string = UUID!

                        constructor() {
                            super(name!, CustomCharacteristic.UUID)

                            const perms = props.perms || [
                                Perms.PAIRED_READ,
                                Perms.PAIRED_WRITE,
                                Perms.NOTIFY,
                            ]

                            this.setProps({
                                ...props,
                                perms,
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
                        RED.nodes.eachNode(() => {})
                        resolve(true)
                    } catch (_) {
                        debug('Waiting for RED to be initialized')
                        setTimeout(isRedInitialized, 1000)
                    }
                }

                isRedInitialized()
            }).then(() => {
                RED.nodes.eachNode((node) => {
                    if (node.type === 'homekit-service') {
                        const serviceNodeConfig = node as HAPServiceConfigType

                        const serviceNode = RED.nodes.getNode(
                            serviceNodeConfig.id
                        ) as HAPServiceNodeType

                        if (
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

        debug('Initialize NRCHKBCustomCharacteristicsAPI')

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
                await storage.setItem(
                    'customCharacteristics',
                    customCharacteristics
                )

                res.sendStatus(200)

                refreshCustomCharacteristics(customCharacteristics)
            }
        )
    }

    // Accessory Categories API response data
    const accessoryCategoriesData: {
        [key: number]: string
    } = {}

    // Accessory API
    const _initAccessoryAPI = function () {
        debug('Initialize AccessoryAPI')

        // Prepare Accessory data once
        Object.keys(HapCategories)
            .sort()
            .filter((x) => parseInt(x) >= 0)
            .forEach((key) => {
                const keyNumber = (key as unknown) as number
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
        _initNRCHKBVersionAPI()
        _initAccessoryAPI()
        _initNRCHKBCustomCharacteristicsAPI()
    }

    return {
        init,
    }
}
