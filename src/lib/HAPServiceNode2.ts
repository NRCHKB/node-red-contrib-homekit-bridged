import { logger } from '@nrchkb/logger'
import { uuid } from 'hap-nodejs'
import { NodeAPI } from 'node-red'

import NRCHKBError from './NRCHKBError'
import HAPHostNodeType from './types/HAPHostNodeType'
import HAPService2ConfigType from './types/HAPService2ConfigType'
import HAPService2NodeType from './types/HAPService2NodeType'
import HostType from './types/HostType'
import { NodeStatusUtils } from './utils/NodeStatusUtils'

module.exports = (RED: NodeAPI) => {
    /**
     * Config override when user created services in old NRCHKB version
     */
    const nrchkbConfigCompatibilityOverride = function (
        this: HAPService2NodeType
    ) {
        const self = this

        const log = logger('NRCHKB', 'HAPServiceNode2', self.config.name, self)

        if (self.config.isParent === undefined) {
            log.trace(
                `nrchkbConfigCompatibilityOverride => self.config.isParent=${self.config.isParent} value changed to true`
            )
            // Services created in pre linked services era where working in 1.2 but due to more typescript in 1.3+ it started to cause some errors
            self.config.isParent = true
        }

        if (self.config.hostType === undefined) {
            // When moving from 1.2 to 1.3 hostType is not defined on homekit-service
            log.trace(
                `nrchkbConfigCompatibilityOverride => self.config.hostType=${self.config.hostType} value changed to HostType.BRIDGE`
            )
            self.config.hostType = HostType.BRIDGE
        }
    }

    const preInit = function (
        this: HAPService2NodeType,
        config: HAPService2ConfigType
    ) {
        const self = this
        self.nodeStatusUtils = new NodeStatusUtils(self)

        self.config = config
        self.name = self.config.name

        const log = logger('NRCHKB', 'HAPServiceNode2', self.config.name, self)

        self.RED = RED
        self.publishTimers = {}

        nrchkbConfigCompatibilityOverride.call(self)
        RED.nodes.createNode(self, self.config)

        const ServiceUtils = require('./utils/ServiceUtils2')(self)

        new Promise<HAPService2ConfigType>((resolve) => {
            if (self.config.waitForSetupMsg) {
                log.debug(
                    'Waiting for Setup message. It should be of format {"payload":{"nrchkb":{"setup":{}}}}'
                )

                self.setupDone = false

                self.nodeStatusUtils.setStatus({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'Waiting for Setup',
                })

                self.handleWaitForSetup = (msg: Record<string, unknown>) =>
                    ServiceUtils.handleWaitForSetup(self.config, msg, resolve)
                self.on('input', self.handleWaitForSetup)
            } else {
                resolve(self.config)
            }
        })
            .then((newConfig) => {
                init.call(self, newConfig)
            })
            .catch((error: any) => {
                log.error(`Error while starting Service due to ${error}`)
            })
    }

    const init = function (
        this: HAPService2NodeType,
        config: HAPService2ConfigType
    ) {
        const self = this
        self.config = config

        const log = logger('NRCHKB', 'HAPServiceNode2', self.config.name, self)

        const ServiceUtils = require('./utils/ServiceUtils2')(self)

        if (self.config.isParent) {
            log.debug('Starting Parent Service')
            configure.call(self)
            self.configured = true
            self.reachable = true
        } else {
            const serviceType =
                config.serviceName === 'CameraControl' ? 'Camera' : 'Linked'

            ServiceUtils.waitForParent()
                .then(() => {
                    log.debug(`Starting  ${serviceType} Service`)
                    configure.call(self)
                    self.configured = true
                })
                .catch((error: any) => {
                    log.error(
                        `Error while starting ${serviceType} Service due to ${error}`
                    )
                })
        }
    }

    const configure = function (this: HAPService2NodeType) {
        const self = this

        const log = logger('NRCHKB', 'HAPServiceNode2', self.config.name, self)

        const Utils = require('./utils')(self)
        const AccessoryUtils = Utils.AccessoryUtils
        const BridgeUtils = Utils.BridgeUtils
        const CharacteristicUtils = require('./utils/CharacteristicUtils2')(
            self
        )
        const ServiceUtils = require('./utils/ServiceUtils2')(self)

        let parentNode: HAPService2NodeType

        if (self.config.isParent) {
            const hostId =
                self.config.hostType == HostType.BRIDGE
                    ? self.config.bridge
                    : self.config.accessoryId

            self.hostNode = RED.nodes.getNode(hostId) as HAPHostNodeType

            if (!self.hostNode) {
                log.error('Host Node not found', false)
                throw new NRCHKBError('Host Node not found')
            }

            self.childNodes = []
            self.childNodes.push(self)
        } else {
            // Retrieve parent service node
            parentNode = RED.nodes.getNode(
                self.config.parentService
            ) as HAPService2NodeType

            if (!parentNode) {
                log.error('Parent Node not assigned', false)
                throw new NRCHKBError('Parent Node not assigned')
            }

            self.parentNode = parentNode
            self.parentService = self.parentNode.service

            if (!self.parentService) {
                log.error('Parent Service not assigned', false)
                throw new NRCHKBError('Parent Service not assigned')
            }

            self.hostNode = self.parentNode.hostNode
            self.parentNode.childNodes?.push(self)

            self.accessory = self.parentNode.accessory
        }

        // Service node properties
        self.name = self.config.name

        // Find a unique identifier for the current service
        if (
            self.hasOwnProperty('_flow') &&
            self.hasOwnProperty('_alias') &&
            self._flow?.hasOwnProperty('TYPE') &&
            self._flow.TYPE === 'subflow'
        ) {
            // For subflows, use the service node identifier from the subflow template
            // plus the full path from the subflow node identifier to the subflow.
            self.uniqueIdentifier = self._alias + '/' + self._flow.path
        } else {
            // For top level flows, use the node identifier
            self.uniqueIdentifier = self.id
        }

        // Generate UUID from unique identifier
        const subtypeUUID = uuid.generate(self.uniqueIdentifier)

        // Look for existing Accessory or create a new one
        if (self.config.hostType == HostType.BRIDGE) {
            if (self.config.isParent) {
                // According to the HomeKit Accessory Protocol Specification the value
                // of the fields Name, Manufacturer, Serial Number and Model must not
                // change throughout the lifetime of an accessory. Because of that the
                // accessory UUID will be generated based on that data to ensure that
                // a new accessory will be created if any of those configuration values
                // changes.
                const accessoryUUID = uuid.generate(
                    'A' +
                        self.uniqueIdentifier +
                        self.name +
                        self.config.manufacturer +
                        self.config.serialNo +
                        self.config.model
                )

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
            log.debug('Binding Service accessory as Standalone Accessory')
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
            BridgeUtils.delayedPublish(self)
        }

        // The pinCode should be shown to the user until interaction with iOS
        // client starts
        self.nodeStatusUtils.setStatus({
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
