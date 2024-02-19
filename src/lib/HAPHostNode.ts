import { logger } from '@nrchkb/logger'
import { MulticastOptions } from 'bonjour-hap'
import {
    Accessory,
    Bridge,
    Categories,
    Characteristic,
    MDNSAdvertiser,
    Service,
    uuid,
} from 'hap-nodejs'
import { NodeAPI } from 'node-red'
import { SemVer } from 'semver'
import semver from 'semver/preload'

import NRCHKBError from './NRCHKBError'
import HapCategories from './types/HapCategories'
import HAPHostConfigType from './types/HAPHostConfigType'
import HAPHostNodeType from './types/HAPHostNodeType'
import HostType from './types/HostType'

module.exports = (RED: NodeAPI, hostType: HostType) => {
    const MdnsUtils = require('./utils/MdnsUtils')()

    const init = function (this: HAPHostNodeType, config: HAPHostConfigType) {
        const self = this
        const log = logger('NRCHKB', 'HAPHostNode', config.bridgeName, self)

        self.hostType = hostType
        RED.nodes.createNode(self, config)

        self.config = config
        self.name = config.bridgeName

        if (!hostNameValidator(config.bridgeName)) {
            log.error('Host name is incorrect', false)
            return new NRCHKBError('Host name is incorrect')
        }

        if (semver.parse(config.firmwareRev) == null) {
            config.firmwareRev = new SemVer('0.0.0')
        }

        if (config.customMdnsConfig) {
            self.mdnsConfig = {} as MulticastOptions

            if (MdnsUtils.checkMulticast(config.mdnsMulticast)) {
                self.mdnsConfig.multicast = config.mdnsMulticast
            }

            if (MdnsUtils.checkInterface(config.mdnsInterface)) {
                self.mdnsConfig.interface = config.mdnsInterface
            }

            if (MdnsUtils.checkPort(config.mdnsPort)) {
                self.mdnsConfig.port = parseInt(config.mdnsPort?.toString())
            }

            if (MdnsUtils.checkIp(config.mdnsIp)) {
                self.mdnsConfig.ip = config.mdnsIp
            }

            if (MdnsUtils.checkTtl(config.mdnsTtl)) {
                self.mdnsConfig.ttl = parseInt(config.mdnsTtl?.toString())
            }

            if (MdnsUtils.checkLoopback(config.mdnsLoopback)) {
                self.mdnsConfig.loopback = config.mdnsLoopback
            }

            if (MdnsUtils.checkReuseAddr(config.mdnsReuseAddr)) {
                self.mdnsConfig.reuseAddr = config.mdnsReuseAddr
            }
        }

        self.accessoryCategory = (self.hostType == HostType.BRIDGE
            ? HapCategories.BRIDGE
            : self.config.accessoryCategory) as unknown as Categories

        self.published = false

        try {
            self.bridgeUsername = macify(self.id)
        } catch (error: any) {
            log.error(error)
            return error
        }

        const hostUUID = uuid.generate(self.id)

        const hostTypeName =
            self.hostType == HostType.BRIDGE ? 'Bridge' : 'Standalone Accessory'

        log.debug(`Creating ${hostTypeName} with UUID ${hostUUID}`)

        if (self.hostType == HostType.BRIDGE) {
            self.host = new Bridge(self.name, hostUUID)
        } else {
            self.host = new Accessory(self.name, hostUUID)
        }

        self.publish = function () {
            if (self.hostType == HostType.BRIDGE) {
                log.debug(
                    `Publishing ${hostTypeName} with pin code ${self.config.pinCode} and ${self.host.bridgedAccessories.length} accessories`
                )
            } else {
                log.debug(
                    `Publishing ${hostTypeName} with pin code ${self.config.pinCode}`
                )
            }

            if (
                (self.config.port && self.config.port == 1880) ||
                (self.mdnsConfig?.port && self.mdnsConfig?.port == 1880)
            ) {
                log.error(
                    `Cannot publish on ${hostTypeName} port 1880 as it is reserved for node-red`
                )
                self.published = false
                return false
            }

            // As HAP-Nodejs cannot understand new pin code format yet, we need to adjust new to old one
            let oldPinCode = self.config.pinCode

            if ((oldPinCode.match(/-/g) || []).length == 1) {
                oldPinCode = oldPinCode.replace(/-/g, '')
                oldPinCode = `${oldPinCode.slice(0, 3)}-${oldPinCode.slice(3, 5)}-${oldPinCode.slice(5, 8)}`
            }

            self.host.publish(
                {
                    username: self.bridgeUsername,
                    port:
                        self.config.port && !isNaN(self.config.port)
                            ? self.config.port
                            : 0,
                    pincode: oldPinCode,
                    category: self.accessoryCategory,
                    mdns: self.mdnsConfig,
                    advertiser:
                        self.config.advertiser ?? MDNSAdvertiser.BONJOUR,
                },
                self.config.allowInsecureRequest
            )

            self.published = true

            return true
        }

        self.on('close', async function (removed: any, done: () => any) {
            if (removed) {
                log.debug('This node has been deleted')
                await self.host.destroy()
            } else {
                log.debug('This node is being restarted')
                await self.host.unpublish()
            }

            self.published = false

            done()
        })

        self.host.on('identify', function (paired: any, callback: () => any) {
            if (paired) {
                log.debug(`Identify called on paired ${hostTypeName}`)
            } else {
                log.debug(`Identify called on unpaired ${hostTypeName}`)
            }

            callback()
        })

        // Service.AccessoryInformation created on Host creation
        const accessoryInformationService =
            self.host.getService(Service.AccessoryInformation) ||
            self.host.addService(Service.AccessoryInformation)

        accessoryInformationService
            .setCharacteristic(
                Characteristic.Manufacturer,
                self.config.manufacturer
            )
            .setCharacteristic(
                Characteristic.SerialNumber,
                self.config.serialNo
            )
            .setCharacteristic(Characteristic.Model, self.config.model)
            .setCharacteristic(
                Characteristic.FirmwareRevision,
                self.config.firmwareRev?.toString()
            )
            .setCharacteristic(
                Characteristic.HardwareRevision,
                self.config.hardwareRev?.toString()
            )
            .setCharacteristic(
                Characteristic.SoftwareRevision,
                self.config.softwareRev?.toString()
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

    const hostNameValidator = function (hostName: string) {
        return hostName ? /^[^.]{1,64}$/.test(hostName) : false
    }

    return {
        init,
        macify,
    }
}
