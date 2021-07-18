import HostType from '../types/HostType'
import HAPServiceNodeType from '../types/HAPServiceNodeType'
import {
    Accessory,
    Characteristic,
    CharacteristicChange,
    CharacteristicGetCallback,
    CharacteristicSetCallback,
    CharacteristicValue,
    Service,
} from 'hap-nodejs'
import HAPServiceConfigType from '../types/HAPServiceConfigType'
import { HAPConnection } from 'hap-nodejs/dist/lib/util/eventedhttp'
import { logger } from '@nrchkb/logger'

module.exports = function (node: HAPServiceNodeType) {
    const log = logger('NRCHKB', 'ServiceUtils', node.config.name, node)

    const HapNodeJS = require('hap-nodejs')
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    const CameraSource = require('../cameraSource').Camera

    const NO_RESPONSE_MSG = 'NO_RESPONSE'

    const prepareHapData = (context: any, connection?: HAPConnection) => {
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
        log.debug(
            `onCharacteristicGet with status: ${this.statusCode}, value: ${
                this.value
            }, reachability is ${
                node.accessory.reachable
            } with context ${JSON.stringify(context)} on connection ${
                connection?.sessionID
            }`
        )

        const topic = node.config.topic ? node.config.topic : node.topic_in
        const msg: {
            payload: any
            hap: any
            name?: string
            topic: string
        } = { payload: {}, hap: {}, name: node.name, topic: topic }
        const key = this.constructor.name

        msg.payload[key] = this.value

        msg.hap = prepareHapData(context, connection)
        msg.hap.oldValue = this.value
        msg.hap.event = 'refresh'

        const statusId = node.setStatus({
            fill: 'grey',
            shape: 'dot',
            text: `event: ${msg.hap.event}`,
        })

        setTimeout(function () {
            node.clearStatus(statusId)
        }, 3000)

        node.send([null, msg])

        if (callback) {
            try {
                callback(
                    node.accessory.reachable
                        ? this.statusCode
                        : new Error(NO_RESPONSE_MSG),
                    this.value
                )
            } catch (_) {}
        }
    }

    const onValueChange = function (
        this: Characteristic,
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
        msg.hap.oldValue = oldValue
        msg.hap.newValue = newValue

        const statusId = node.setStatus({
            fill: 'yellow',
            shape: 'dot',
            text: key + ': ' + newValue,
        })

        setTimeout(function () {
            node.clearStatus(statusId)
        }, 3000)

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

    // eslint-disable-next-line no-unused-vars
    const onCharacteristicSet = function (
        this: Characteristic,
        newValue: CharacteristicValue,
        callback: CharacteristicSetCallback,
        context: any,
        connection?: HAPConnection
    ) {
        log.debug(
            `onCharacteristicSet with status: ${this.statusCode}, value: ${
                this.value
            }, reachability is ${node.accessory.reachable} 
            with context ${JSON.stringify(context)} on connection ${
                connection?.sessionID
            }`
        )

        try {
            if (callback) {
                callback(
                    node.accessory.reachable ? null : new Error(NO_RESPONSE_MSG)
                )
            }
        } catch (_) {}

        onValueChange.call(
            this,
            1,
            {
                undefined,
                newValue,
                context,
            },
            connection
        )
    }

    const onCharacteristicChange = function (
        this: Characteristic,
        change: CharacteristicChange
    ) {
        const { oldValue, newValue, context, originator, reason } = change

        log.debug(
            `onCharacteristicChange with reason: ${reason}, oldValue: ${oldValue}, newValue: ${newValue}, reachability is ${
                node.accessory.reachable
            } 
            with context ${JSON.stringify(context)} on connection ${
                originator?.sessionID
            }`
        )

        if (oldValue != newValue) {
            onValueChange.call(
                this,
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

    const onInput = function (msg: Record<string, any>) {
        if (msg.hasOwnProperty('payload')) {
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
        if (msg.payload.hasOwnProperty('Context')) {
            context = msg.payload.Context
            delete msg.payload.Context
        }

        node.topic_in = msg.topic ? msg.topic : ''

        // iterate over characteristics to be written
        // eslint-disable-next-line no-unused-vars
        Object.keys(msg.payload).map((key: string) => {
            if (node.supported.indexOf(key) < 0) {
                log.error(
                    `Try one of these characteristics: ${node.supported.join(
                        ', '
                    )}`
                )
            } else {
                if (
                    (node.config.isParent &&
                        node.config.hostType == HostType.BRIDGE) ||
                    (!node.config.isParent &&
                        node.hostNode.hostType == HostType.BRIDGE)
                ) {
                    // updateReachability is only supported on bridged accessories
                    node.accessory.updateReachability(
                        msg.payload[key] !== NO_RESPONSE_MSG
                    )
                }

                const characteristic = node.service.getCharacteristic(
                    Characteristic[key]
                )

                if (context !== null) {
                    characteristic.setValue(
                        msg.payload[key],
                        undefined,
                        context
                    )
                } else {
                    characteristic.setValue(msg.payload[key])
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
            config: HAPServiceConfigType
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
        config: HAPServiceConfigType
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
            node.setStatus({
                fill: 'blue',
                shape: 'dot',
                text: 'Waiting for Parent Service',
            })

            const checkAndWait = () => {
                const parentNode: HAPServiceNodeType = node.RED.nodes.getNode(
                    node.config.parentService
                ) as HAPServiceNodeType

                if (parentNode && parentNode.configured) {
                    resolve(parentNode)
                } else {
                    setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        }).catch((error) => {
            log.error(`Waiting for Parent Service failed due to: ${error}`)
            throw error
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
