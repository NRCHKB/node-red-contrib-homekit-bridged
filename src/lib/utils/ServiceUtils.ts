import {
    type Accessory,
    type ActiveAdaptiveLightingTransition,
    AdaptiveLightingController,
    AdaptiveLightingControllerMode,
    type AdaptiveLightingOptions,
    type Characteristic,
    type CharacteristicChange,
    type CharacteristicGetCallback,
    type CharacteristicSetCallback,
    type CharacteristicValue,
    HAPStatus,
    HapStatusError,
    type Service,
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import { configureCamera } from '../camera/CameraControl'
import type { HAPConnection } from '../hap/hap-nodejs'
import NRCHKBError from '../NRCHKBError'
import type HAPServiceConfigType from '../types/HAPServiceConfigType'
import type HAPServiceNodeType from '../types/HAPServiceNodeType'

const buildAdaptiveLightingOptions = (
    config: Pick<
        HAPServiceConfigType,
        | 'adaptiveLightingOptionsMode'
        | 'adaptiveLightingOptionsCustomTemperatureAdjustment'
    >
): AdaptiveLightingOptions => ({
    controllerMode:
        config.adaptiveLightingOptionsMode !== undefined
            ? +config.adaptiveLightingOptionsMode
            : AdaptiveLightingControllerMode.AUTOMATIC,
    customTemperatureAdjustment:
        config.adaptiveLightingOptionsCustomTemperatureAdjustment !== undefined
            ? +config.adaptiveLightingOptionsCustomTemperatureAdjustment
            : undefined,
})

const describeContext = (context: unknown): string => {
    if (context === null) {
        return 'null'
    }

    if (context === undefined) {
        return 'undefined'
    }

    const type = typeof context
    if (type !== 'object') {
        return String(context)
    }

    if (Array.isArray(context)) {
        return `Array(${context.length})`
    }

    const keys = Object.keys(context as Record<string, unknown>)
    return keys.length > 0
        ? `Object(${keys.slice(0, 5).join(',')}${keys.length > 5 ? ',...' : ''})`
        : 'Object'
}

const describeSupported = (supported: Set<string>): string =>
    Array.from(supported).join("', '")

const buildServiceUtils = (node: HAPServiceNodeType) => {
    const log = logger('NRCHKB', 'ServiceUtils', node.config.name, node)

    const { Service, Characteristic } = require('@homebridge/hap-nodejs')

    const NO_RESPONSE_MSG = 'NO_RESPONSE'

    const prepareHapData = (context?: any, connection?: HAPConnection) => {
        const hap: { [key: string]: any } = {}

        if (connection) {
            hap.session = {
                sessionID: connection.sessionID,
                username: connection.username,
                remoteAddress: connection.remoteAddress,
                localAddress: connection.localAddress,
                httpPort: connection.remotePort,
            }

            hap.context = {}
        }

        if (context) {
            hap.context = context
        }

        return hap
    }

    const onCharacteristicGet = function (
        this: Characteristic,
        callback: CharacteristicGetCallback,
        context: any,
        connection?: HAPConnection
    ) {
        const reachability = (node.parentNode ?? node).reachable

        log.debug(
            `onCharacteristicGet with status: ${this.statusCode}, value: ${this.value}, reachability is ${reachability} with context ${describeContext(context)} on connection ${connection?.sessionID}`
        )

        if (callback) {
            try {
                callback(
                    (node.parentNode ?? node).reachable
                        ? null
                        : new HapStatusError(
                              HAPStatus.SERVICE_COMMUNICATION_FAILURE
                          ),
                    this.value
                )
            } catch (_) {}
        }
    }

    const onValueChange = function (
        this: Characteristic,
        allCharacteristics: Characteristic[],
        outputNumber: number,
        { oldValue, newValue, context }: any,
        connection?: HAPConnection
    ) {
        const topic = node.config.topic ? node.config.topic : node.topic_in
        const msg: {
            payload: { [key: string]: any }
            hap: any
            name?: string
            topic: string
        } = { payload: {}, hap: {}, name: node.name, topic: topic }
        const key = this.constructor.name

        msg.payload[key] = newValue

        msg.hap = prepareHapData(context, connection)
        const allChars: { [key: string]: any } = {}
        for (const singleChar of allCharacteristics) {
            const cKey = singleChar.constructor.name
            allChars[cKey] = singleChar.value
        }
        msg.hap.allChars = allChars

        if (oldValue !== undefined) {
            msg.hap.oldValue = oldValue
        }

        msg.hap.reachable = node.reachable ?? node.parentNode?.reachable

        if (msg.hap.reachable === false) {
            ;[node, ...(node.childNodes ?? [])].forEach((n) => {
                n.nodeStatusUtils.setStatus({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Not reachable',
                    type: 'NO_RESPONSE',
                })
            })
        } else {
            msg.hap.newValue = newValue

            node.nodeStatusUtils.setStatus(
                {
                    fill: 'yellow',
                    shape: 'dot',
                    text: `${key}: ${newValue}`,
                },
                3000
            )

            node.childNodes?.forEach((n) => {
                n.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
            })
            node.parentNode?.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
        }

        log.debug(`${node.name} received ${key} : ${newValue}`)

        if (
            connection ||
            context ||
            node.hostNode.config.allowMessagePassthrough
        ) {
            if (outputNumber === 0) {
                node.send(msg)
            } else if (outputNumber === 1) {
                node.send([null, msg])
            }
        }
    }

    const onCharacteristicSet = (allCharacteristics: Characteristic[]) =>
        function (
            this: Characteristic,
            newValue: CharacteristicValue,
            callback: CharacteristicSetCallback,
            context: any,
            connection?: HAPConnection
        ) {
            const reachability = (node.parentNode ?? node).reachable

            log.debug(
                `onCharacteristicSet with status: ${this.statusCode}, value: ${this.value}, reachability is ${reachability} with context ${describeContext(context)} on connection ${connection?.sessionID}`
            )

            try {
                if (callback) {
                    callback(
                        (node.parentNode ?? node).reachable
                            ? null
                            : new HapStatusError(
                                  HAPStatus.SERVICE_COMMUNICATION_FAILURE
                              )
                    )
                }
            } catch (_) {}

            onValueChange.call(
                this,
                allCharacteristics,
                1,
                {
                    newValue,
                    context,
                },
                connection
            )
        }

    const onCharacteristicChange = (allCharacteristics: Characteristic[]) =>
        function (this: Characteristic, change: CharacteristicChange) {
            const { oldValue, newValue, context, originator, reason } = change

            log.debug(
                `onCharacteristicChange with reason: ${reason}, oldValue: ${oldValue}, newValue: ${newValue}, reachability is ${(node.parentNode ?? node).reachable} with context ${describeContext(context)} on connection ${originator?.sessionID}`
            )

            if (oldValue !== newValue) {
                onValueChange.call(
                    this,
                    allCharacteristics,
                    0,
                    {
                        oldValue,
                        newValue,
                        context,
                    },
                    originator
                )
            }
        }

    const onInput = (msg: Record<string, any>) => {
        if (msg.payload) {
            // payload must be an object
            const type = typeof msg.payload

            if (type !== 'object') {
                log.error(`Invalid payload type: ${type}`)
                return
            }
        } else {
            log.error('Invalid message (payload missing)')
            return
        }

        const topic = node.config.topic ?? node.name
        if (node.config.filter && msg.topic !== topic) {
            log.debug(
                "msg.topic doesn't match configured value and filter is enabled. Dropping message."
            )
            return
        }

        let context: any = null
        if (msg.payload.Context) {
            context = msg.payload.Context
            delete msg.payload.Context
        }

        node.topic_in = msg.topic ?? ''

        for (const key in msg.payload) {
            if (!Object.hasOwn(msg.payload, key)) {
                continue
            }

            if (!node.supported.has(key)) {
                if (
                    key === 'AdaptiveLightingController' &&
                    node.adaptiveLightingController
                ) {
                    const value = msg.payload?.[key]
                    const event = value?.event

                    if (event === 'disable') {
                        node.adaptiveLightingController?.disableAdaptiveLighting()
                    }
                } else {
                    log.error(
                        `Instead of '${key}' try one of these characteristics: '${describeSupported(node.supported)}'`
                    )
                }
            } else {
                const value = msg.payload?.[key]
                const normalizedValue =
                    value === NO_RESPONSE_MSG ? false : value

                const parentNode = node.parentNode ?? node
                parentNode.reachable = value !== NO_RESPONSE_MSG

                const characteristic = node.service.getCharacteristic(
                    Characteristic[key]
                )

                if (context !== null) {
                    characteristic.setValue(normalizedValue, context)
                } else {
                    characteristic.setValue(normalizedValue)
                }
            }
        }
    }

    const onClose = (removed: boolean, done: () => void) => {
        if (node.waitForParentTimer) {
            clearTimeout(node.waitForParentTimer)
            node.waitForParentTimer = undefined
        }

        Object.values(node.publishTimers).forEach((timer) => {
            clearTimeout(timer)
        })
        node.publishTimers = {}

        const characteristics = node.service
            ? node.service.characteristics.concat(
                  node.service.optionalCharacteristics
              )
            : []

        characteristics.forEach((characteristic) => {
            // cleanup all node specific listeners
            characteristic.removeListener('get', node.onCharacteristicGet)
            characteristic.removeListener('set', node.onCharacteristicSet)
            characteristic.removeListener('change', node.onCharacteristicChange)
        })

        if (node.config.isParent && node.accessory && node.onIdentify) {
            // remove identify listener to prevent errors with undefined values
            node.accessory.removeListener('identify', node.onIdentify)
        }

        if (removed && node.accessory) {
            // This node has been deleted
            if (node.config.isParent) {
                // remove accessory from the bridge
                node.hostNode.host.removeBridgedAccessories([node.accessory])
                node.accessory.destroy()
            } else if (node.service && node.parentService) {
                // only remove the service if it is not a parent
                node.accessory.removeService(node.service)
                node.parentService.removeLinkedService(node.service)
            }
        }

        // Clean up any pending status timeouts
        node.nodeStatusUtils.cleanup()

        done()
    }

    const getOrCreate = (
        accessory: Accessory,
        serviceInformation: {
            name: string
            UUID: string
            serviceName: string
            config: HAPServiceConfigType
        },
        parentService: Service
    ): Service => {
        if (serviceInformation.serviceName === 'CameraControl') {
            let service: Service | undefined = accessory.services.find(
                (service) => {
                    return (
                        service.UUID === Service.CameraRTPStreamManagement.UUID
                    )
                }
            )

            if (!service) {
                configureCameraSource(accessory, serviceInformation.config)
                service = accessory.services.find((service) => {
                    return (
                        service.UUID === Service.CameraRTPStreamManagement.UUID
                    )
                })
            }

            if (!service) {
                throw new NRCHKBError(
                    'Failed to configure CameraControl service.'
                )
            }

            return service
        }

        const ServiceConstructor = Service[serviceInformation.serviceName]

        if (typeof ServiceConstructor !== 'function') {
            throw new NRCHKBError(
                `Unknown HomeKit service "${serviceInformation.serviceName}".`
            )
        }

        const newService = new ServiceConstructor(
            serviceInformation.name,
            serviceInformation.UUID
        )
        log.debug(
            `Looking for service with UUID ${serviceInformation.UUID} ...`
        )

        // search for a service with the same subtype
        let service: Service | undefined = accessory.services.find(
            (service) => {
                return newService.subtype === service.subtype
            }
        )

        if (service && newService.UUID !== service.UUID) {
            // if the UUID and therefore the type changed, the whole service
            // will be replaced
            log.debug('... service type changed! Removing the old service.')
            accessory.removeService(service)
            service = undefined
        }

        if (!service) {
            // if no matching service was found or the type changed, then a new
            // service will be added
            log.debug(
                `... didn't find it. Adding new ${serviceInformation.serviceName} service.`
            )

            service = accessory.addService(newService)
        } else {
            // if a service with the same UUID and subtype was found, it will
            // be updated and used
            log.debug('... found it! Updating it.')
            service
                .getCharacteristic(Characteristic.Name)
                .setValue(serviceInformation.name)
        }

        if (parentService) {
            if (service) {
                log.debug('... and linking service to parent.')
                parentService.addLinkedService(service)
            }
        }

        return service ?? newService
    }

    const configureCameraSource = (
        accessory: Accessory,
        config: HAPServiceConfigType
    ) => {
        if (config.cameraConfigSource) {
            log.debug('Configuring Camera Source')

            if (!config.cameraConfigVideoProcessor) {
                log.error(
                    'Missing configuration for CameraControl: videoProcessor cannot be empty!'
                )
            } else {
                // Use of deprecated method to be replaced with new Camera API
                // TODO: https://github.com/homebridge/HAP-NodeJS/blob/latest/src/accessories/Camera_accessory.ts
                // accessory.configureCameraSource(
                //     new CameraSource(service, config, node)
                // )
                configureCamera(accessory, config)
            }
        } else {
            log.error('Missing configuration for CameraControl.')
        }
    }

    const waitForParent = () => {
        log.debug('Waiting for Parent Service')

        return new Promise((resolve) => {
            node.nodeStatusUtils.setStatus({
                fill: 'blue',
                shape: 'dot',
                text: 'Waiting for Parent Service',
            })

            const checkAndWait = () => {
                const parentNode: HAPServiceNodeType = node.RED.nodes.getNode(
                    node.config.parentService
                ) as HAPServiceNodeType

                if (parentNode?.configured) {
                    node.waitForParentTimer = undefined
                    resolve(parentNode)
                } else {
                    node.waitForParentTimer = setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        }).catch((error) => {
            log.error(`Waiting for Parent Service failed due to: ${error}`)
            throw new NRCHKBError(error)
        })
    }

    const handleWaitForSetup = (
        config: HAPServiceConfigType,
        msg: Record<string, any>,
        resolve: (newConfig: HAPServiceConfigType) => void
    ) => {
        if (node.setupDone) {
            return
        }

        if (
            msg &&
            Object.hasOwn(msg, 'payload') &&
            msg.payload &&
            typeof msg.payload === 'object' &&
            Object.hasOwn(msg.payload, 'nrchkb') &&
            msg.payload.nrchkb &&
            typeof msg.payload.nrchkb === 'object' &&
            Object.hasOwn(msg.payload.nrchkb, 'setup')
        ) {
            node.setupDone = true

            const newConfig = {
                ...config,
                ...msg.payload.nrchkb.setup,
            }

            node.removeListener('input', node.handleWaitForSetup)

            resolve(newConfig)
        } else {
            node.removeListener('input', node.handleWaitForSetup)

            log.error(
                'Invalid message (required {"payload":{"nrchkb":{"setup":{}}}})'
            )
        }
    }

    const configureAdaptiveLightning = () => {
        if (
            node.service.UUID === Service.Lightbulb.UUID &&
            node.config.adaptiveLightingOptionsEnable
        ) {
            try {
                node.service.getCharacteristic(Characteristic.Brightness)
                node.service.getCharacteristic(Characteristic.ColorTemperature)

                const options = buildAdaptiveLightingOptions(node.config)

                log.trace(`Configuring Adaptive Lighting with options:`)
                log.trace(JSON.stringify(options))

                const adaptiveLightingController =
                    new AdaptiveLightingController(node.service, options)

                adaptiveLightingController.on('update', () => {
                    const activeAdaptiveLightingTransition: Partial<ActiveAdaptiveLightingTransition> =
                        {
                            transitionStartMillis:
                                adaptiveLightingController.getAdaptiveLightingStartTimeOfTransition(),
                            timeMillisOffset:
                                adaptiveLightingController.getAdaptiveLightingTimeOffset(),
                            transitionCurve:
                                adaptiveLightingController.getAdaptiveLightingTransitionCurve(),
                            brightnessAdjustmentRange:
                                adaptiveLightingController.getAdaptiveLightingBrightnessMultiplierRange(),
                            updateInterval:
                                adaptiveLightingController.getAdaptiveLightingUpdateInterval(),
                            notifyIntervalThreshold:
                                adaptiveLightingController.getAdaptiveLightingNotifyIntervalThreshold(),
                        }
                    node.send({
                        payload: {
                            AdaptiveLightingController: {
                                event: 'update',
                                data: activeAdaptiveLightingTransition,
                            },
                        },
                    })
                })
                adaptiveLightingController.on('disable', () => {
                    node.send({
                        payload: {
                            AdaptiveLightingController: {
                                event: 'disable',
                            },
                        },
                    })
                })

                node.accessory.configureController(adaptiveLightingController)

                node.adaptiveLightingController = adaptiveLightingController
            } catch (error) {
                log.error(
                    `Failed to configure Adaptive Lightning due to ${error}`
                )
            }
        }
    }

    return {
        getOrCreate,
        onCharacteristicGet,
        onCharacteristicSet,
        onCharacteristicChange,
        onInput,
        onClose,
        waitForParent,
        handleWaitForSetup,
        configureAdaptiveLightning,
    }
}

;(
    buildServiceUtils as typeof buildServiceUtils & {
        buildAdaptiveLightingOptions: typeof buildAdaptiveLightingOptions
    }
).buildAdaptiveLightingOptions = buildAdaptiveLightingOptions

export = buildServiceUtils
