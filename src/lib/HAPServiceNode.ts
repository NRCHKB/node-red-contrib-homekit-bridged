import { NodeAPI } from 'node-red'
import HAPServiceConfigType from './types/HAPServiceConfigType'
import HAPServiceNodeType from './types/HAPServiceNodeType'
import HAPHostNodeType from './types/HAPHostNodeType'
import HostType from './types/HostType'
import { uuid } from 'hap-nodejs'
import UnifiedLogger from './utils/UnifiedLogger'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('NRCHKB:HAPServiceNode')

    /**
     * Config override when user created services in old NRCHKB version
     */
    const nrchkbConfigCompatibilityOverride = function (
        this: HAPServiceNodeType
    ) {
        const self = this

        if (self.config.isParent === undefined) {
            debug(
                'nrchkbConfigCompatibilityOverride => self.config.isParent=' +
                    self.config.isParent +
                    ' value changed to true'
            )
            // Services created in pre linked services era where working in 1.2 but due to more typescript in 1.3+ it started to cause some errors
            self.config.isParent = true
        }

        if (self.config.hostType === undefined) {
            // When moving from 1.2 to 1.3 hostType is not defined on homekit-service
            if (self.config.isParent) {
                debug(
                    'nrchkbConfigCompatibilityOverride => self.config.hostType=' +
                        self.config.hostType +
                        ' value changed to HostType.BRIDGE'
                )
                self.config.hostType = HostType.BRIDGE
            }
        }
    }

    const preInit = function (
        this: HAPServiceNodeType,
        config: HAPServiceConfigType
    ) {
        const self = this
        self.config = config
        self.RED = RED
        self.publishTimers = {}

        nrchkbConfigCompatibilityOverride.call(self)
        RED.nodes.createNode(self, config)

        const ServiceUtils = require('./utils/ServiceUtils')(self)

        new Promise<HAPServiceConfigType>((resolve) => {
            if (config.waitForSetupMsg) {
                debug(
                    'Waiting for Setup message. It should be of format {"payload":{"nrchkb":{"setup":{}}}}'
                )

                self.setupDone = false

                self.status({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'Waiting for Setup',
                })

                self.handleWaitForSetup = (msg: Record<string, unknown>) =>
                    ServiceUtils.handleWaitForSetup(config, msg, resolve)
                self.on('input', self.handleWaitForSetup)
            } else {
                resolve(config)
            }
        }).then((newConfig) => {
            init.call(self, newConfig)
        })
    }

    const init = function (
        this: HAPServiceNodeType,
        config: HAPServiceConfigType
    ) {
        const self = this
        self.config = config

        const ServiceUtils = require('./utils/ServiceUtils')(self)

        if (self.config.isParent) {
            debug('Starting Parent Service ' + config.name)
            configure.call(self)
            self.configured = true
        } else {
            ServiceUtils.waitForParent()
                .then(() => {
                    debug(
                        'Starting ' +
                            (config.serviceName === 'CameraControl'
                                ? 'Camera'
                                : 'Linked') +
                            ' Service ' +
                            config.name
                    )
                    configure.call(self)
                    self.configured = true
                })
                .catch((error: any) => {
                    UnifiedLogger.error(
                        self,
                        'Error while starting ' +
                            (config.serviceName === 'CameraControl'
                                ? 'Camera'
                                : 'Linked') +
                            ' Service',
                        error
                    )
                })
        }
    }

    const configure = function (this: HAPServiceNodeType) {
        const self = this

        const Utils = require('./utils')(self)
        const AccessoryUtils = Utils.AccessoryUtils
        const BridgeUtils = Utils.BridgeUtils
        const CharacteristicUtils = Utils.CharacteristicUtils
        const ServiceUtils = Utils.ServiceUtils

        let parentNode: HAPServiceNodeType

        if (self.config.isParent) {
            const hostId =
                self.config.hostType == HostType.BRIDGE
                    ? self.config.bridge
                    : self.config.accessoryId

            self.hostNode = RED.nodes.getNode(hostId) as HAPHostNodeType

            if (!self.hostNode) {
                UnifiedLogger.error(self, 'Host Node not found')
                throw Error('Host Node not found')
            }

            self.childNodes = []
            self.childNodes.push(self)
        } else {
            // Retrieve parent service node
            parentNode = RED.nodes.getNode(
                self.config.parentService
            ) as HAPServiceNodeType

            if (!parentNode) {
                throw Error('Parent Node not assigned')
            }

            self.parentService = parentNode.service

            if (!self.parentService) {
                throw Error('Parent Service not assigned')
            }

            self.hostNode = parentNode.hostNode
            parentNode.childNodes.push(self)

            self.accessory = parentNode.accessory
        }

        // Service node properties
        self.name = self.config.name

        // Generate UUID from node id
        const subtypeUUID = uuid.generate(self.id)

        // Look for existing Accessory or create a new one
        if (self.config.hostType == HostType.BRIDGE) {
            // According to the HomeKit Accessory Protocol Specification the value
            // of the fields Name, Manufacturer, Serial Number and Model must not
            // change throughout the lifetime of an accessory. Because of that the
            // accessory UUID will be generated based on that data to ensure that
            // a new accessory will be created if any of those configuration values
            // changes.
            const accessoryUUID = uuid.generate(
                'A' +
                    self.id +
                    self.name +
                    self.config.manufacturer +
                    self.config.serialNo +
                    self.config.model
            )

            if (self.config.isParent) {
                self.accessory = AccessoryUtils.getOrCreate(
                    self.hostNode.host,
                    {
                        name: self.name,
                        UUID: accessoryUUID,
                        manufacturer: self.config.manufacturer,
                        serialNo: self.config.serialNo,
                        model: self.config.model,
                        firmwareRev: self.config.firmwareRev,
                        hardwareRev: self.config.hardwareRev,
                        softwareRev: self.config.softwareRev,
                    },
                    subtypeUUID // subtype of the primary service for identification
                )

                //Respond to identify
                self.onIdentify = AccessoryUtils.onIdentify
                self.accessory.on('identify', self.onIdentify)
            }
        } else {
            // We are using Standalone Accessory mode so no need to create new Accessory as we have "host" already
            debug('Binding Service accessory as Standalone Accessory')
            self.accessory = self.hostNode.host
        }

        // Look for existing Service or create a new one
        self.service = ServiceUtils.getOrCreate(
            self.accessory,
            {
                name: self.name,
                UUID: subtypeUUID,
                serviceName: self.config.serviceName,
                config: self.config,
            },
            self.parentService
        )

        self.characteristicProperties = CharacteristicUtils.load(
            self.service,
            self.config
        )

        if (self.config.isParent) {
            self.publishTimers = BridgeUtils.delayedPublish(self)
        }

        // The pinCode should be shown to the user until interaction with iOS
        // client starts
        self.status({
            fill: 'yellow',
            shape: 'ring',
            text: self.hostNode.config.pinCode,
        })

        // Emit message when value changes
        // service.on("characteristic-change", ServiceUtils.onCharacteristicChange);

        // Subscribe to set and get on characteristics for that service and get
        // list of all supported
        self.supported = CharacteristicUtils.subscribeAndGetSupported(
            self.service
        )

        // Respond to inputs
        self.on('input', ServiceUtils.onInput)

        self.on('close', ServiceUtils.onClose)
    }

    return {
        preInit,
        init,
    }
}
