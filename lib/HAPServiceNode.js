module.exports = function(RED) {
    const debug = require('debug')('NRCHKB')
    const HapNodeJS = require('hap-nodejs')
    const uuid = HapNodeJS.uuid
    let publishTimers = {}

    const init = function(config) {
        RED.nodes.createNode(this, config)

        this.isParentNode =
            typeof config.isParent === 'boolean' ? config.isParent : true

        if (this.isParentNode) {
            debug('Starting Parent Service ' + config.name)
            configure(this, config)
        } else {
            waitForParent(this, config)
                .then(() => {
                    debug(
                        'Starting ' +
                            (config.serviceName === 'CameraControl'
                                ? 'Camera'
                                : 'Linked') +
                            ' Service ' +
                            config.name
                    )
                    configure(this, config)
                })
                .catch(e => {
                    this.status({
                        fill: 'red',
                        shape: 'ring',
                        text:
                            'Error while starting ' +
                            (config.serviceName === 'CameraControl'
                                ? 'Camera'
                                : 'Linked') +
                            ' Service',
                    })

                    this.error(
                        'Error while starting ' +
                            (config.serviceName === 'CameraControl'
                                ? 'Camera'
                                : 'Linked') +
                            ' Service ' +
                            config.name +
                            ': ',
                        e
                    )
                })
        }
    }

    function waitForParent(node, config) {
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, reject) => {
            node.status({
                fill: 'yellow',
                shape: 'ring',
                text: 'Waiting for Parent Service',
            })

            const checkAndWait = () => {
                if (RED.nodes.getNode(config.parentService)) {
                    resolve()
                } else {
                    setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        })
    }

    const configure = function(node, config) {
        const Utils = require('./utils')(node)
        const AccessoryUtils = Utils.AccessoryUtils
        const BridgeUtils = Utils.BridgeUtils
        const CharacteristicUtils = Utils.CharacteristicUtils
        const ServiceUtils = Utils.ServiceUtils

        node.bridgeNode
        let parentNode
        node.parentService

        if (node.isParentNode) {
            node.bridgeNode = RED.nodes.getNode(config.bridge)
            node.childNodes = []
            node.childNodes.push(node)
        } else {
            // Retrieve parent service node
            parentNode = RED.nodes.getNode(config.parentService)

            if (!parentNode) {
                throw Error('Parent Node not assigned')
            }

            node.parentService = parentNode.service

            if (!node.parentService) {
                throw Error('Parent Service not assigned')
            }

            node.bridgeNode = parentNode.bridgeNode
            parentNode.childNodes.push(node)
        }

        // Service node properties
        node.name = config.name
        node.topic = config.topic
        node.filter = config.filter
        node.serviceName = config.serviceName
        node.manufacturer = config.manufacturer
        node.serialNo = config.serialNo
        node.model = config.model
        node.accessoryType = config.accessoryType
        node.firmwareRev = config.firmwareRev

        const bridge = node.bridgeNode.bridge

        // Generate UUID from node id
        const subtypeUUID = uuid.generate(node.id)

        // According to the HomeKit Accessory Protocol Specification the value
        // of the fields Name, Manufacturer, Serial Number and Model must not
        // change throughout the lifetime of an accessory. Because of that the
        // accessory UUID will be generated based on that data to ensure that
        // a new accessory will be created if any of those configuration values
        // changes.
        const accessoryUUID = uuid.generate(
            'A' +
                node.id +
                node.name +
                node.manufacturer +
                node.serialNo +
                node.model
        )

        // Look for existing Accessory or create a new one
        let accessory
        if (node.isParentNode) {
            accessory = AccessoryUtils.getOrCreate(
                bridge,
                {
                    name: node.name,
                    UUID: accessoryUUID,
                    manufacturer: node.manufacturer,
                    serialNo: node.serialNo,
                    model: node.model,
                    firmwareRev: node.firmwareRev
                },
                subtypeUUID // subtype of the primary service for identification
            )

            //Respond to identify
            node.onIdentify = AccessoryUtils.onIdentify
            accessory.on('identify', node.onIdentify)
        } else {
            accessory = parentNode.accessory
        }

        // Look for existing Service or create a new one
        const service = ServiceUtils.getOrCreate(
            accessory,
            {
                name: node.name,
                UUID: subtypeUUID,
                serviceName: node.serviceName,
                config: config,
            },
            node.parentService
        )

        node.characteristicProperties = CharacteristicUtils.load(
            service,
            config
        )

        publishTimers = BridgeUtils.delayedPublish(node, publishTimers)

        node.service = service

        // The pinCode should be shown to the user until interaction with iOS
        // client starts
        node.status({
            fill: 'yellow',
            shape: 'ring',
            text: node.bridgeNode.pinCode,
        })

        // Emit message when value changes
        // service.on("characteristic-change", ServiceUtils.onCharacteristicChange);

        // Subscribe to set and get on characteristics for that service and get
        // list of all supported
        node.supported = CharacteristicUtils.subscribeAndGetSupported(service)

        // Respond to inputs
        node.on('input', ServiceUtils.onInput)

        node.on('close', ServiceUtils.onClose)

        node.accessory = accessory
    }

    return {
        init: init,
    }
}
