import { logger } from '@nrchkb/logger'
import {
    Accessory,
    Characteristic,
    CharacteristicChange,
    CharacteristicEventTypes,
    CharacteristicGetCallback,
    CharacteristicSetCallback,
    CharacteristicValue,
    HAPStatus,
    HapStatusError,
    Service,
} from 'hap-nodejs'
import {
    HAPConnection,
    HAPUsername,
} from 'hap-nodejs/dist/lib/util/eventedhttp'
import { SessionIdentifier } from 'hap-nodejs/dist/types'

import NRCHKBError from '../NRCHKBError'
import { Storage } from '../Storage'
import HAPService2ConfigType from '../types/HAPService2ConfigType'
import HAPService2NodeType from '../types/HAPService2NodeType'

module.exports = function (node: HAPService2NodeType) {
    const log = logger('NRCHKB', 'ServiceUtils2', node.config.name, node)

    const HapNodeJS = require('hap-nodejs')
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    const CameraSource = require('../cameraSource').Camera

    const NO_RESPONSE_MSG = 'NO_RESPONSE'

    type HAPServiceNodeEvent = {
        name: CharacteristicEventTypes // Event type
        context?: {
            callbackID?: string // ID used to update Characteristic value with get event
            key?: string // Characteristic key
            reason?: string
        } & Record<string, unknown> // Additional event data provided by event caller
    }

    type HAPServiceMessage = {
        payload?: { [key: string]: any }
        hap?: {
            oldValue?: any
            newValue?: any
            reachable?: boolean
            event?: HAPServiceNodeEvent
            session?: {
                sessionID?: SessionIdentifier
                username?: HAPUsername
                remoteAddress?: string
                localAddress?: string
                httpPort?: number
            }
            allChars: { [key: string]: any }
        }
        name?: string
        topic?: string
    }

    const output = function (
        this: Characteristic,
        allCharacteristics: Characteristic[],
        event: CharacteristicEventTypes | HAPServiceNodeEvent,
        { oldValue, newValue }: any,
        connection?: HAPConnection
    ) {
        const eventObject = typeof event === 'object' ? event : { name: event }

        log.debug(
            `${eventObject.name} event, oldValue: ${oldValue}, newValue: ${newValue}, connection ${connection?.sessionID}`
        )

        const msg: HAPServiceMessage = {
            name: node.name,
            topic: node.config.topic ? node.config.topic : node.topic_in,
        }
        msg.payload = {}
        msg.hap = {
            event: eventObject,
            allChars: allCharacteristics.reduce<{ [key: string]: any }>(
                (allChars, singleChar) => {
                    const cKey = singleChar.constructor.name
                    allChars[cKey] = singleChar.value
                    return allChars
                },
                {}
            ),
            oldValue,
        }

        const key = this.constructor.name

        msg.hap.reachable = node.reachable ?? node.parentNode?.reachable

        if (msg.hap.reachable === false) {
            ;[node, ...(node.childNodes ?? [])].forEach((n) =>
                n.nodeStatusUtils.setStatus({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Not reachable',
                    type: 'NO_RESPONSE',
                })
            )
        } else {
            msg.hap.newValue = newValue

            node.nodeStatusUtils.setStatus(
                {
                    fill: 'yellow',
                    shape: 'dot',
                    text: `[${eventObject.name}] ${key}${
                        newValue != undefined ? `: ${newValue}` : ''
                    }`,
                },
                3000
            )

            node.childNodes?.forEach((n) =>
                n.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
            )
            node.parentNode?.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
        }

        msg.payload[key] = newValue

        if (connection) {
            msg.hap.session = {
                sessionID: connection.sessionID,
                username: connection.username,
                remoteAddress: connection.remoteAddress,
                localAddress: connection.localAddress,
                httpPort: connection.remotePort,
            }
        }

        log.debug(
            `${node.name} received ${eventObject.name} ${key}: ${newValue}`
        )

        if (connection || node.hostNode.config.allowMessagePassthrough) {
            node.send(msg)
        }
    }

    const onCharacteristicGet = (allCharacteristics: Characteristic[]) =>
        function (
            this: Characteristic,
            callback: CharacteristicGetCallback,
            _context: any,
            connection?: HAPConnection
        ) {
            const characteristic = this
            const oldValue = characteristic.value

            const delayedCallback = (value?: any) => {
                const newValue = value ?? characteristic.value
                if (callback) {
                    try {
                        callback(
                            (node.parentNode ?? node).reachable
                                ? null
                                : new HapStatusError(
                                      HAPStatus.SERVICE_COMMUNICATION_FAILURE
                                  ),
                            newValue
                        )
                    } catch (_) {}
                }

                output.call(
                    characteristic,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.GET,
                        context: { key: this.displayName },
                    },
                    { oldValue, newValue },
                    connection
                )
            }

            if (node.config.useEventCallback) {
                const callbackID = Storage.saveCallback({
                    event: CharacteristicEventTypes.GET,
                    callback: delayedCallback,
                })

                log.debug(
                    `Registered callback ${callbackID} for Characteristic ${characteristic.displayName}`
                )

                output.call(
                    this,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.GET,
                        context: { callbackID, key: this.displayName },
                    },
                    { oldValue },
                    connection
                )
            } else {
                delayedCallback()
            }
        }

    // eslint-disable-next-line no-unused-vars
    const onCharacteristicSet = (allCharacteristics: Characteristic[]) =>
        function (
            this: Characteristic,
            newValue: CharacteristicValue,
            callback: CharacteristicSetCallback,
            _context: any,
            connection?: HAPConnection
        ) {
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

            output.call(
                this,
                allCharacteristics,
                {
                    name: CharacteristicEventTypes.SET,
                    context: { key: this.displayName },
                },
                { newValue },
                connection
            )
        }

    const onCharacteristicChange = (allCharacteristics: Characteristic[]) =>
        function (this: Characteristic, change: CharacteristicChange) {
            const { oldValue, newValue, context, originator, reason } = change

            if (oldValue != newValue) {
                output.call(
                    this,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.CHANGE,
                        context: { reason, key: this.displayName },
                    },
                    { oldValue, newValue, context },
                    originator
                )
            }
        }

    const onInput = function (msg: HAPServiceMessage) {
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

        const topic = node.config.topic ? node.config.topic : node.name
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

        // iterate over characteristics to be written
        // eslint-disable-next-line no-unused-vars
        Object.keys(msg.payload).map((key: string) => {
            if (node.supported.indexOf(key) < 0) {
                if (
                    node.config.useEventCallback &&
                    Storage.uuid4Validate(key)
                ) {
                    const callbackID = key
                    const callbackValue = msg.payload?.[key]
                    const eventCallback = Storage.loadCallback(callbackID)

                    if (eventCallback) {
                        log.debug(
                            `Calling ${eventCallback.event} callback ${callbackID}`
                        )
                        eventCallback.callback(callbackValue)
                    } else {
                        log.error(`Callback ${callbackID} timeout`)
                    }
                } else {
                    log.error(
                        `Instead of '${key}' try one of these characteristics: '${node.supported.join(
                            "', '"
                        )}'`
                    )
                }
            } else {
                const value = msg.payload?.[key]

                const parentNode = node.parentNode ?? node
                parentNode.reachable = value !== NO_RESPONSE_MSG

                const characteristic = node.service.getCharacteristic(
                    Characteristic[key]
                )

                if (context !== null) {
                    characteristic.setValue(value, context)
                } else {
                    characteristic.setValue(value)
                }
            }
        })
    }

    const onClose = function (removed: boolean, done: () => void) {
        const characteristics = node.service.characteristics.concat(
            node.service.optionalCharacteristics
        )

        characteristics.forEach(function (characteristic) {
            // cleanup all node specific listeners
            characteristic.removeListener('get', node.onCharacteristicGet)
            characteristic.removeListener('set', node.onCharacteristicSet)
            characteristic.removeListener('change', node.onCharacteristicChange)
        })

        if (node.config.isParent) {
            // remove identify listener to prevent errors with undefined values
            node.accessory.removeListener('identify', node.onIdentify)
        }

        if (removed) {
            // This node has been deleted
            if (node.config.isParent) {
                // remove accessory from bridge
                node.hostNode.host.removeBridgedAccessories([node.accessory])
                node.accessory.destroy()
            } else {
                // only remove the service if it is not a parent
                node.accessory.removeService(node.service)
                node.parentService.removeLinkedService(node.service)
            }
        }

        done()
    }

    const getOrCreate = function (
        accessory: Accessory,
        serviceInformation: {
            name: string
            UUID: string
            serviceName: string
            config: HAPService2ConfigType
        },
        parentService: Service
    ) {
        const newService = new Service[serviceInformation.serviceName](
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

            if (serviceInformation.serviceName === 'CameraControl') {
                configureCameraSource(
                    accessory,
                    newService,
                    serviceInformation.config
                )
                service = newService
            } else {
                service = accessory.addService(newService)
            }
        } else {
            // if a service with the same UUID and subtype was found it will
            // be updated and used
            log.debug('... found it! Updating it.')
            service
                .getCharacteristic(Characteristic.Name)
                .setValue(serviceInformation.name)
        }

        if (parentService) {
            if (serviceInformation.serviceName === 'CameraControl') {
                //We don't add or link it since configureCameraSource do this already.
                log.debug('... and adding service to accessory.')
            } else if (service) {
                log.debug('... and linking service to parent.')
                parentService.addLinkedService(service)
            }
        }

        return service
    }

    const configureCameraSource = function (
        accessory: Accessory,
        service: Service,
        config: HAPService2ConfigType
    ) {
        if (config.cameraConfigSource) {
            log.debug('Configuring Camera Source')

            if (!config.cameraConfigVideoProcessor) {
                log.error(
                    'Missing configuration for CameraControl: videoProcessor cannot be empty!'
                )
            } else {
                // Use of deprecated method to be replaced with new Camera API
                accessory.configureCameraSource(
                    new CameraSource(service, config, node)
                )
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
                const parentNode: HAPService2NodeType = node.RED.nodes.getNode(
                    node.config.parentService
                ) as HAPService2NodeType

                if (parentNode && parentNode.configured) {
                    resolve(parentNode)
                } else {
                    setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        }).catch((error) => {
            log.error(`Waiting for Parent Service failed due to: ${error}`)
            throw new NRCHKBError(error)
        })
    }

    const handleWaitForSetup = (
        config: HAPService2ConfigType,
        msg: Record<string, any>,
        resolve: (newConfig: HAPService2ConfigType) => void
    ) => {
        if (node.setupDone) {
            return
        }

        if (
            msg.hasOwnProperty('payload') &&
            msg.payload.hasOwnProperty('nrchkb') &&
            msg.payload.nrchkb.hasOwnProperty('setup')
        ) {
            node.setupDone = true

            const newConfig = {
                ...config,
                ...msg.payload.nrchkb.setup,
            }

            node.removeListener('input', node.handleWaitForSetup)

            resolve(newConfig)
        } else {
            log.error(
                'Invalid message (required {"payload":{"nrchkb":{"setup":{}}}})'
            )
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
    }
}
