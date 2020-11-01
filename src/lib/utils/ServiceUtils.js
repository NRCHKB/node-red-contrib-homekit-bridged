module.exports = function (node) {
    const debug = require('debug')('NRCHKB:ServiceUtils')
    const HapNodeJS = require('hap-nodejs')
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    const CameraSource = require('../cameraSource').Camera

    const NO_RESPONSE_MSG = 'NO_RESPONSE'

    const onCharacteristicGet = function (callback) {
        debug(
            'onCharacteristicGet with status: ' +
                this.status +
                ' and value ' +
                this.value +
                ' and reachability is ' +
                node.accessory.reachable
        )
        callback(
            node.accessory.reachable === true
                ? this.status
                : new Error(NO_RESPONSE_MSG),
            this.value
        )
    }

    const onValueChange = function (
        outputNumber,
        { oldValue, newValue, context }
    ) {
        const topic = node.topic ? node.topic : node.topic_in
        const msg = { payload: {}, hap: {}, name: node.name, topic: topic }
        const key = this.displayName.replace(/ /g, '').replace(/\./g, '_')

        msg.payload[key] = newValue

        if (context) {
            msg.hap = {
                oldValue: oldValue,
                newValue: newValue,
                context: context,
            }
        }

        node.status({
            fill: 'yellow',
            shape: 'dot',
            text: key + ': ' + newValue,
        })

        setTimeout(function () {
            node.status({})
        }, 3000)

        debug(node.name + ' received ' + key + ': ' + newValue)

        if (context || node.hostNode.allowMessagePassthrough) {
            if (outputNumber === 0) {
                node.send(msg)
            } else if (outputNumber === 1) {
                node.send([null, msg])
            }
        }
    }

    // eslint-disable-next-line no-unused-vars
    const onCharacteristicSet = function (newValue, callback, context) {
        debug(
            'onCharacteristicSet with status: ' +
                this.status +
                ' and value ' +
                this.value +
                ' and reachability is ' +
                node.accessory.reachable
        )
        callback(
            node.accessory.reachable === true
                ? null
                : new Error(NO_RESPONSE_MSG)
        )

        onValueChange.call(this, 1, {
            undefined,
            newValue,
            context,
        })
    }

    const onCharacteristicChange = function ({ oldValue, newValue, context }) {
        onValueChange.call(this, 0, {
            oldValue,
            newValue,
            context,
        })
    }

    const onInput = function (msg) {
        if (msg.hasOwnProperty('payload')) {
            // payload must be an object
            const type = typeof msg.payload

            if (type !== 'object') {
                node.warn('Invalid payload type: ' + type)
                return
            }
        } else {
            node.warn('Invalid message (payload missing)')
            return
        }

        const topic = node.topic ? node.topic : node.name
        if (node.filter === true && msg.topic !== topic) {
            debug(
                "msg.topic doesn't match configured value and filter is enabled. Dropping message."
            )
            return
        }

        let context = null
        if (msg.payload.hasOwnProperty('Context')) {
            context = msg.payload.Context
            delete msg.payload.Context
        }

        node.topic_in = msg.topic ? msg.topic : ''

        // iterate over characteristics to be written
        // eslint-disable-next-line no-unused-vars
        Object.keys(msg.payload).map(function (key, index) {
            if (node.supported.indexOf(key) < 0) {
                node.warn(
                    'Try one of these characteristics: ' +
                        node.supported.join(', ')
                )
            } else {
                if (node.config.hostType == HostType.BRIDGE) {
                    // updateReachability is only supported on bridged accessories
                    node.accessory.updateReachability(
                        msg.payload[key] !== NO_RESPONSE_MSG
                    )
                }

                let characteristic = node.service.getCharacteristic(
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

    const onClose = function (removed, done) {
        const characteristics = node.service.characteristics.concat(
            node.service.optionalCharacteristics
        )

        characteristics.forEach(function (characteristic) {
            // cleanup all node specific listeners
            characteristic.removeListener('get', node.onCharacteristicGet)
            characteristic.removeListener('set', node.onCharacteristicSet)
            characteristic.removeListener('change', node.onCharacteristicChange)
        })

        if (node.isParentNode) {
            // remove identify listener to prevent errors with undefined values
            node.accessory.removeListener('identify', node.onIdentify)
        }

        if (removed) {
            // This node has been deleted
            if (node.isParentNode) {
                // remove accessory from bridge
                node.hostNode.bridge.removeBridgedAccessories([node.accessory])
                node.accessory.destroy()
            } else {
                // only remove the service if it is not a parent
                node.accessory.removeService(node.service)
                node.parentService.removeLinkedService(node.service)
            }
        } else {
            // This node is being restarted
            node.accessory = null
        }

        done()
    }

    /**
     * serviceInformation
     *  name
     *  UUID
     *  serviceName
     */
    const getOrCreate = function (
        accessory,
        serviceInformation,
        parentService
    ) {
        let service = null
        const newService = new Service[serviceInformation.serviceName](
            serviceInformation.name,
            serviceInformation.UUID
        )
        debug(
            "Looking for service with UUID '" + serviceInformation.UUID + "'..."
        )

        // search for a service with the same subtype
        service = accessory.services.find((service) => {
            return newService.subtype === service.subtype
        })

        if (service && newService.UUID !== service.UUID) {
            // if the UUID and therefore the type changed, the whole service
            // will be replaced
            debug('... service type changed! Removing the old service.')
            accessory.removeService(service)
            service = null
        }

        if (!service) {
            // if no matching service was found or the type changed, then a new
            // service will be added
            debug(
                "... didn't find it. Adding new " +
                    serviceInformation.serviceName +
                    ' service.'
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
            debug('... found it! Updating it.')
            service
                .getCharacteristic(Characteristic.Name)
                .setValue(serviceInformation.name)
        }

        if (parentService) {
            if (serviceInformation.serviceName === 'CameraControl') {
                //We don't add or link it since configureCameraSource do this already.
                debug('... and adding service to accessory.')
            } else {
                debug('... and linking service to parent.')
                parentService.addLinkedService(service)
            }
        }

        return service
    }

    const configureCameraSource = function (accessory, service, config) {
        if (config.cameraConfigSource) {
            debug('Configuring Camera Source')

            if (!config.cameraConfigVideoProcessor) {
                node.error(
                    'Missing configuration for CameraControl: videoProcessor cannot be empty!'
                )
            } else {
                accessory.configureCameraSource(
                    new CameraSource(service, config, node)
                )
            }
        } else {
            node.error('Missing configuration for CameraControl.')
        }
    }

    const waitForParent = () => {
        debug(node.name + ' is waiting for Parent Service')

        return new Promise((resolve) => {
            node.status({
                fill: 'blue',
                shape: 'dot',
                text: 'Waiting for Parent Service',
            })

            const checkAndWait = () => {
                if (node.RED.nodes.getNode(node.config.parentService)) {
                    resolve()
                } else {
                    setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        }).catch((error) => {
            node.error('Waiting for Parent Service failed due to: ' + error)

            throw error
        })
    }

    const handleWaitForSetup = (config, msg, resolve) => {
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
            node.warn(
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
