module.exports = function(node) {
    const debug = require('debug')('NRCHKB')
    const HapNodeJS = require('hap-nodejs')
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    const CameraSource = require('../cameraSource').Camera

    const onCharacteristicGet = function(callback) {
        if (node.accessory.reachable === true) {
            //callback(null, characteristic.value)
            callback(null, this.value)
        } else {
            callback('no response', null)
        }
    }

    const onValueChange = function(outputNumber, {oldValue, newValue, context}) {
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

        setTimeout(function() {
            node.status({})
        }, 3000)

        debug(node.name + ' received ' + key + ': ' + newValue)

        if (context || node.bridgeNode.allowMessagePassthrough) {
            if (outputNumber === 0) {
                node.send(msg)
            } else if (outputNumber === 1) {
                node.send([null, msg])
            }
        }
    }

    // eslint-disable-next-line no-unused-vars
    const onCharacteristicSet = function(newValue, callback, context) {
        callback(node.accessory.reachable === true ? null : 'no response')

        onValueChange.call(this, 1, {
            undefined,
            newValue,
            context
        })
    }

    const onCharacteristicChange = function({ oldValue, newValue, context }) {
        onValueChange.call(this, 0, {
            oldValue,
            newValue,
            context
        })
    }

    const onInput = function(msg) {
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
                'msg.topic doesn\'t match configured value and filter is enabled. Dropping message.'
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
        Object.keys(msg.payload).map(function(key, index) {
            if (node.supported.indexOf(key) < 0) {
                node.warn(
                    'Try one of these characteristics: ' +
                        node.supported.join(', ')
                )
            } else {
                let characteristic = node.service.getCharacteristic(
                    Characteristic[key]
                )
                const noResponseMsg = 'NO_RESPONSE'

                if (msg.payload[key] === noResponseMsg) {
                    node.accessory.updateReachability(false)
                    characteristic.updateValue(new Error(noResponseMsg))

                    return
                }

                node.accessory.updateReachability(true)

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

    const onClose = function(removed, done) {
        const characteristics = node.service.characteristics.concat(
            node.service.optionalCharacteristics
        )

        characteristics.forEach(function(characteristic) {
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
                node.bridgeNode.bridge.removeBridgedAccessories([
                    node.accessory,
                ])
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
    const getOrCreate = function(accessory, serviceInformation, parentService) {
        let service = null
        const newService = new Service[serviceInformation.serviceName](
            serviceInformation.name,
            serviceInformation.UUID
        )
        debug(
            'Looking for service with UUID \'' + serviceInformation.UUID + '\'...'
        )

        // search for a service with the same subtype
        service = accessory.services.find(service => {
            return newService.subtype === service.subtype
        })

        if (service && newService.UUID !== service.UUID) {
            // if the UUID and therefor the type changed, the wohle service
            // will be replaced
            debug('... service type changed! Removing the old service.')
            accessory.removeService(service)
            service = null
        }

        if (!service) {
            // if no matching service was found or the type changed, then a new
            // service will be added
            debug(
                '... didn\'t find it. Adding new ' +
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

    const configureCameraSource = function(accessory, service, config) {
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

    return {
        getOrCreate: getOrCreate,
        onCharacteristicGet: onCharacteristicGet,
        onCharacteristicSet: onCharacteristicSet,
        onCharacteristicChange: onCharacteristicChange,
        onInput: onInput,
        onClose: onClose,
    }
}
