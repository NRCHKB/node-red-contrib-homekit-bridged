import {
  Accessory,
  Bridge,
  type Categories,
  Characteristic,
  MDNSAdvertiser,
  Service,
  uuid
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type { NodeAPI } from 'node-red'
import { SemVer } from 'semver'
import semver from 'semver/preload'

import NRCHKBError from './NRCHKBError'
import type HAPHostConfigType from './types/HAPHostConfigType'
import type HAPHostNodeType from './types/HAPHostNodeType'
import HostType from './types/HostType'
import HapCategories from './types/hap-nodejs/HapCategories'

module.exports = (RED: NodeAPI, hostType: HostType) => {
  const init = function (this: HAPHostNodeType, config: HAPHostConfigType) {
    const log = logger('NRCHKB', 'HAPHostNode', config.bridgeName, this)

    this.hostType = hostType
    RED.nodes.createNode(this, config)

    this.config = config
    this.name = config.bridgeName

    if (!hostNameValidator(config.bridgeName)) {
      log.error('Host name is incorrect', false)
      return new NRCHKBError('Host name is incorrect')
    }

    if (semver.parse(config.firmwareRev) == null) {
      config.firmwareRev = new SemVer('0.0.0')
    }

    // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
    this.accessoryCategory = (this.hostType == HostType.BRIDGE
      ? HapCategories.BRIDGE
      : this.config.accessoryCategory) as unknown as Categories

    this.published = false

    try {
      this.bridgeUsername = macify(this.id)
    } catch (error: any) {
      log.error(error)
      return error
    }

    const hostUUID = uuid.generate(this.id)

    const hostTypeName =
      // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
      this.hostType == HostType.BRIDGE ? 'Bridge' : 'Standalone Accessory'

    log.debug(`Creating ${hostTypeName} with UUID ${hostUUID}`)

    // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
    if (this.hostType == HostType.BRIDGE) {
      this.host = new Bridge(this.name, hostUUID)
    } else {
      this.host = new Accessory(this.name, hostUUID)
    }

    this.publish = () => {
      // biome-ignore lint/suspicious/noDoubleEquals: hostType can be a string or a number
      if (this.hostType == HostType.BRIDGE) {
        log.debug(
          `Publishing ${hostTypeName} with pin code ${this.config.pinCode} and ${this.host.bridgedAccessories.length} accessories`
        )
      } else {
        log.debug(
          `Publishing ${hostTypeName} with pin code ${this.config.pinCode}`
        )
      }

      if (this.config.port === 1880) {
        log.error(
          `Cannot publish on ${hostTypeName} port 1880 as it is reserved for node-red`
        )
        this.published = false
        return false
      }

      // As HAP-Nodejs cannot understand new pin code format yet, we need to adjust new to old one
      let oldPinCode = this.config.pinCode

      if ((oldPinCode.match(/-/g) || []).length === 1) {
        oldPinCode = oldPinCode.replace(/-/g, '')
        oldPinCode = `${oldPinCode.slice(0, 3)}-${oldPinCode.slice(3, 5)}-${oldPinCode.slice(5, 8)}`
      }

      let bind: string | undefined
      if (this.config.bind?.length && this.config.bindType) {
        if (this.config.bindType === 'str') {
          bind = this.config.bind
        } else if (this.config.bindType === 'json') {
          bind = JSON.parse(this.config.bind)
        }
      }

      this.host.publish(
        {
          username: this.bridgeUsername,
          port:
            this.config.port && !Number.isNaN(this.config.port)
              ? this.config.port
              : 0,
          pincode: oldPinCode,
          category: this.accessoryCategory,
          bind: bind,
          advertiser: this.config.advertiser ?? MDNSAdvertiser.BONJOUR
        },
        this.config.allowInsecureRequest
      )

      this.published = true

      return true
    }

    this.on('close', async (removed: any, done: () => any) => {
      if (removed) {
        log.debug('This node has been deleted')
        await this.host.destroy()
      } else {
        log.debug('This node is being restarted')
        await this.host.unpublish()
      }

      this.published = false

      done()
    })

    this.host.on('identify', (paired: any, callback: () => any) => {
      if (paired) {
        log.debug(`Identify called on paired ${hostTypeName}`)
      } else {
        log.debug(`Identify called on unpaired ${hostTypeName}`)
      }

      callback()
    })

    // Service.AccessoryInformation created on Host creation
    const accessoryInformationService =
      this.host.getService(Service.AccessoryInformation) ||
      this.host.addService(Service.AccessoryInformation)

    accessoryInformationService
      .setCharacteristic(Characteristic.Manufacturer, this.config.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.config.serialNo)
      .setCharacteristic(Characteristic.Model, this.config.model)
      .setCharacteristic(
        Characteristic.FirmwareRevision,
        this.config.firmwareRev?.toString()
      )
      .setCharacteristic(
        Characteristic.HardwareRevision,
        this.config.hardwareRev?.toString()
      )
      .setCharacteristic(
        Characteristic.SoftwareRevision,
        this.config.softwareRev?.toString()
      )
  }

  const macify = (nodeId: string): string => {
    if (nodeId) {
      const noDecimalStr = nodeId.replace('.', '')
      const paddedStr = noDecimalStr.padEnd(12, '0')

      const match = paddedStr.match(/.{1,2}/g)

      if (match) {
        return match.join(':').substr(0, 17).toUpperCase()
      } else {
        throw new NRCHKBError(
          `match failed in macify process for padded string ${paddedStr}`
        )
      }
    } else {
      throw new NRCHKBError('nodeId cannot be empty in macify process')
    }
  }

  const hostNameValidator = (hostName: string) =>
    hostName ? /^[^.]{1,64}$/.test(hostName) : false

  return {
    init,
    macify
  }
}
