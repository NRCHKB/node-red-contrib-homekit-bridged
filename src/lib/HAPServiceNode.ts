import { NodeAPI } from 'node-red'
import HAPServiceConfigType from './types/HAPServiceConfigType'
import HAPServiceNodeType from './types/HAPServiceNodeType'
import HAPBridgeNodeType from './types/HAPBridgeNodeType'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('NRCHKB:HAPServiceNode')
    const HapNodeJS = require('hap-nodejs')
    const uuid = HapNodeJS.uuid
    let publishTimers = {}

    const preInit = function(this: HAPServiceNodeType, config: HAPServiceConfigType) {
        RED.nodes.createNode(this, config)

        const node = this
        node.RED = RED

        const ServiceUtils = require('./utils/ServiceUtils')(node)

        new Promise<HAPServiceConfigType>((resolve) => {
            if (config.waitForSetupMsg) {
                debug('Waiting for Setup message. It should be of format {"payload":{"nrchkb":{"setup":{}}}}')

                node.setupDone = false

                node.status({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'Waiting for Setup',
                })

                node.handleWaitForSetup = (msg: {}) => ServiceUtils.handleWaitForSetup(config, msg, resolve)
                node.on('input', node.handleWaitForSetup)
            } else {
                resolve(config)
            }
        }).then((newConfig) => {
            init.call(node, newConfig)
        })
    }

    const init = function(this: HAPServiceNodeType, config: HAPServiceConfigType) {
        this.config = config

        const ServiceUtils = require('./utils/ServiceUtils')(this)

        this.isParentNode = config.isParent

        if (this.isParentNode) {
            debug('Starting Parent Service ' + config.name)
            configure(this, config)
        } else {
            ServiceUtils.waitForParent(this, config)
                .then(() => {
                    debug(
                        'Starting ' +
                        (config.serviceName === 'CameraControl'
                            ? 'Camera'
                            : 'Linked') +
                        ' Service ' +
                        config.name,
                    )
                    configure(this, config)
                })
                .catch((e: any) => {
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
                        e,
                    )
                })
        }
    }

    const configure = function(node: HAPServiceNodeType, config: HAPServiceConfigType) {
        const Utils = require('./utils')(node)
        const AccessoryUtils = Utils.AccessoryUtils
        const BridgeUtils = Utils.BridgeUtils
        const CharacteristicUtils = Utils.CharacteristicUtils
        const ServiceUtils = Utils.ServiceUtils

        let parentNode: HAPServiceNodeType

        if (node.isParentNode) {
            node.bridgeNode = RED.nodes.getNode(config.bridge) as HAPBridgeNodeType
            node.childNodes = []
            node.childNodes.push(node)
        } else {
            // Retrieve parent service node
            parentNode = RED.nodes.getNode(config.parentService) as HAPServiceNodeType

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
        node.firmwareRev = config.firmwareRev
        node.hardwareRev = config.hardwareRev
        node.softwareRev = config.softwareRev

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
            node.model,
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
                    firmwareRev: node.firmwareRev,
                    hardwareRev: node.hardwareRev,
                    softwareRev: node.softwareRev,
                },
                subtypeUUID, // subtype of the primary service for identification
            )

            //Respond to identify
            node.onIdentify = AccessoryUtils.onIdentify
            accessory.on('identify', node.onIdentify)
        } else {
            accessory = parentNode!.accessory
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
            node.parentService,
        )

        node.characteristicProperties = CharacteristicUtils.load(
            service,
            config,
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
        preInit,
        init,
    }
}
