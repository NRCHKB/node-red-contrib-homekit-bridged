import { uuid } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type { NodeAPI } from 'node-red'

import NRCHKBError from './NRCHKBError'
import type HAPHostNodeType from './types/HAPHostNodeType'
import type HAPServiceConfigType from './types/HAPServiceConfigType'
import type HAPServiceNodeType from './types/HAPServiceNodeType'
import HostType from './types/HostType'
import { NodeStatusUtils } from './utils/NodeStatusUtils'

module.exports = (RED: NodeAPI) => {
  /**
   * Config override when user created services in old NRCHKB version
   */
  const nrchkbConfigCompatibilityOverride = function (
    this: HAPServiceNodeType
  ) {
    const log = logger('NRCHKB', 'HAPServiceNode', this.config.name, this)

    if (this.config.isParent === undefined) {
      log.trace(
        `nrchkbConfigCompatibilityOverride => self.config.isParent=${this.config.isParent} value changed to true`
      )
      // Services created in pre linked services era where working in 1.2 but due to more typescript in 1.3+ it started to cause some errors
      this.config.isParent = true
    }

    if (this.config.hostType === undefined) {
      // When moving from 1.2 to 1.3 hostType is not defined on homekit-service
      log.trace(
        `nrchkbConfigCompatibilityOverride => self.config.hostType=${this.config.hostType} value changed to HostType.BRIDGE`
      )
      this.config.hostType = HostType.BRIDGE
    }
  }

  const preInit = function (
    this: HAPServiceNodeType,
    config: HAPServiceConfigType
  ) {
    this.nodeStatusUtils = new NodeStatusUtils(this)

    this.config = config
    this.name = this.config.name

    const log = logger('NRCHKB', 'HAPServiceNode', this.config.name, this)

    this.RED = RED
    this.publishTimers = {}

    nrchkbConfigCompatibilityOverride.call(this)
    RED.nodes.createNode(this, this.config)

    const ServiceUtils = require('./utils/ServiceUtils')(this)

    new Promise<HAPServiceConfigType>((resolve) => {
      if (this.config.waitForSetupMsg) {
        log.debug(
          'Waiting for Setup message. It should be of format {"payload":{"nrchkb":{"setup":{}}}}'
        )

        this.setupDone = false

        this.nodeStatusUtils.setStatus({
          fill: 'blue',
          shape: 'dot',
          text: 'Waiting for Setup'
        })

        this.handleWaitForSetup = (msg: Record<string, unknown>) =>
          ServiceUtils.handleWaitForSetup(this.config, msg, resolve)
        this.on('input', this.handleWaitForSetup)
      } else {
        resolve(this.config)
      }
    })
      .then((newConfig) => {
        init.call(this, newConfig)
      })
      .catch((error: any) => {
        log.error(`Error while starting Service due to ${error}`)
      })
  }

  const init = function (
    this: HAPServiceNodeType,
    config: HAPServiceConfigType
  ) {
    this.config = config

    const log = logger('NRCHKB', 'HAPServiceNode', this.config.name, this)

    const ServiceUtils = require('./utils/ServiceUtils')(this)

    if (this.config.isParent) {
      log.debug('Starting Parent Service')
      configure.call(this)
      this.configured = true
      this.reachable = true
    } else {
      const serviceType =
        config.serviceName === 'CameraControl' ? 'Camera' : 'Linked'

      ServiceUtils.waitForParent()
        .then(() => {
          log.debug(`Starting  ${serviceType} Service`)
          configure.call(this)
          this.configured = true
        })
        .catch((error: any) => {
          log.error(
            `Error while starting ${serviceType} Service due to ${error}`
          )
        })
    }
  }

  const configure = function (this: HAPServiceNodeType) {
    const log = logger('NRCHKB', 'HAPServiceNode', this.config.name, this)

    const Utils = require('./utils')(this)
    const AccessoryUtils = Utils.AccessoryUtils
    const BridgeUtils = Utils.BridgeUtils
    const CharacteristicUtils = Utils.CharacteristicUtils
    const ServiceUtils = Utils.ServiceUtils

    let parentNode: HAPServiceNodeType

    if (this.config.isParent) {
      const hostId =
        // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
        this.config.hostType == HostType.BRIDGE
          ? this.config.bridge
          : this.config.accessoryId

      this.hostNode = RED.nodes.getNode(hostId) as HAPHostNodeType

      if (!this.hostNode) {
        // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
        const message = `Host node ${this.config.hostType == HostType.BRIDGE ? 'Bridge' : 'Standalone Accessory'} ${hostId} not found`
        log.error(message, false)
        throw new NRCHKBError(message)
      }

      this.childNodes = []
      this.childNodes.push(this)
    } else {
      // Retrieve parent service node
      parentNode = RED.nodes.getNode(
        this.config.parentService
      ) as HAPServiceNodeType

      if (!parentNode) {
        log.error('Parent Node not assigned', false)
        throw new NRCHKBError('Parent Node not assigned')
      }

      this.parentNode = parentNode
      this.parentService = this.parentNode.service

      if (!this.parentService) {
        log.error('Parent Service not assigned', false)
        throw new NRCHKBError('Parent Service not assigned')
      }

      this.hostNode = this.parentNode.hostNode
      this.parentNode.childNodes?.push(this)

      this.accessory = this.parentNode.accessory
    }

    // Service node properties
    this.name = this.config.name

    // Find a unique identifier for the current service
    if (
      Object.hasOwn(this, '_flow') &&
      Object.hasOwn(this, '_alias') &&
      (this._flow ? Object(this._flow).hasOwn('TYPE') : false) &&
      this._flow?.TYPE === 'subflow'
    ) {
      // For subflows, use the service node identifier from the subflow template
      // plus the full path from the subflow node identifier to the subflow.
      this.uniqueIdentifier = `${this._alias}/${this._flow.path}`
    } else {
      // For top level flows, use the node identifier
      this.uniqueIdentifier = this.id
    }

    // Generate UUID from unique identifier
    const subtypeUUID = uuid.generate(this.uniqueIdentifier)

    // Look for existing Accessory or create a new one
    // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
    if (this.config.hostType == HostType.BRIDGE) {
      if (this.config.isParent) {
        // According to the HomeKit Accessory Protocol Specification the value
        // of the fields Name, Manufacturer, Serial Number and Model must not
        // change throughout the lifetime of an accessory. Because of that the
        // accessory UUID will be generated based on that data to ensure that
        // a new accessory will be created if any of those configuration values
        // changes.
        const accessoryUUID = uuid.generate(
          'A' +
            this.uniqueIdentifier +
            this.name +
            this.config.manufacturer +
            this.config.serialNo +
            this.config.model
        )

        this.accessory = AccessoryUtils.getOrCreate(
          this.hostNode.host,
          {
            name: this.name,
            UUID: accessoryUUID,
            manufacturer: this.config.manufacturer,
            serialNo: this.config.serialNo,
            model: this.config.model,
            firmwareRev: this.config.firmwareRev,
            hardwareRev: this.config.hardwareRev,
            softwareRev: this.config.softwareRev
          },
          subtypeUUID // subtype of the primary service for identification
        )

        //Respond to identify
        this.onIdentify = AccessoryUtils.onIdentify
        this.accessory.on('identify', this.onIdentify)
      }
    } else {
      // We are using Standalone Accessory mode so no need to create new Accessory as we have "host" already
      log.debug('Binding Service accessory as Standalone Accessory')
      this.accessory = this.hostNode.host
    }

    // Look for existing Service or create a new one
    this.service = ServiceUtils.getOrCreate(
      this.accessory,
      {
        name: this.name,
        UUID: subtypeUUID,
        serviceName: this.config.serviceName,
        config: this.config
      },
      this.parentService
    )

    this.characteristicProperties = CharacteristicUtils.load(
      this.service,
      this.config
    )

    ServiceUtils.configureAdaptiveLightning()

    if (this.config.isParent) {
      BridgeUtils.delayedPublish(this)
    }

    // The pinCode should be shown to the user until interaction with iOS
    // client starts
    this.nodeStatusUtils.setStatus({
      fill: 'yellow',
      shape: 'ring',
      text: this.hostNode.config.pinCode
    })

    // Emit message when value changes
    // service.on("characteristic-change", ServiceUtils.onCharacteristicChange);

    // Subscribe to set and get on characteristics for that service and get
    // list of all supported
    this.supported = CharacteristicUtils.subscribeAndGetSupported(this.service)

    // Respond to inputs
    this.on('input', ServiceUtils.onInput)

    this.on('close', ServiceUtils.onClose)
  }

  return {
    preInit,
    init
  }
}
