import { NodeAPI } from 'node-red'
import HAPHostConfigType from './types/HAPHostConfigType'
import HAPHostNodeType from './types/HAPHostNodeType'
import HostType from './types/HostType'
import semver from 'semver/preload'
import {
    Accessory,
    Bridge,
    Categories,
    Characteristic,
    Service,
    uuid,
} from 'hap-nodejs'
import HapCategories from './types/HapCategories'
import { SemVer } from 'semver'
import { logger } from './logger'

module.exports = (RED: NodeAPI, hostType: HostType) => {
    const MdnsUtils = require('./utils/MdnsUtils')()

    const init = function (this: HAPHostNodeType, config: HAPHostConfigType) {
        const self = this
        const [logDebug, logError] = logger(
            'HAPHostNode',
            config.bridgeName,
            self
        )

        self.hostType = hostType
        RED.nodes.createNode(self, config)

        self.config = config
        self.name = config.bridgeName

        if (!hostNameValidator(config.bridgeName)) {
            logError('Host name is incorrect', false)
            throw Error('Host name is incorrect')
        }

        if (semver.parse(config.firmwareRev) == null) {
            config.firmwareRev = new SemVer('0.0.0')
        }

        if (config.customMdnsConfig) {
            self.mdnsConfig = {}

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

        self.accessoryCategory = ((self.hostType == HostType.BRIDGE
            ? HapCategories.BRIDGE
            : self.config.accessoryCategory) as unknown) as Categories

        self.published = false
        self.bridgeUsername = macify(self.id)
        const hostUUID = uuid.generate(self.id)

        const hostTypeName =
            self.hostType == HostType.BRIDGE ? 'Bridge' : 'Standalone Accessory'

        logDebug(`Creating ${hostTypeName} with UUID ${hostUUID}`)

        if (self.hostType == HostType.BRIDGE) {
            self.host = new Bridge(self.name, hostUUID)
        } else {
            self.host = new Accessory(self.name, hostUUID)
        }

        self.publish = function () {
            if (self.hostType == HostType.BRIDGE) {
                logDebug(
                    `Publishing ${hostTypeName} with pin code ${self.config.pinCode} and ${self.host.bridgedAccessories.length} accessories`
                )
            } else {
                logDebug(
                    `Publishing ${hostTypeName} with pin code ${self.config.pinCode}`
                )
            }

            if (
                (self.config.port && self.config.port == 1880) ||
                (self.mdnsConfig?.port && self.mdnsConfig?.port == 1880)
            ) {
                logError(
                    `Cannot publish on ${hostTypeName} port 1880 as it is reserved for node-red`
                )
                self.published = false
                return false
            }

            self.host.publish(
                {
                    username: self.bridgeUsername,
                    port: self.config.port,
                    pincode: self.config.pinCode,
                    category: self.accessoryCategory,
                    mdns: self.mdnsConfig,
                },
                self.config.allowInsecureRequest
            )

            self.published = true

            return true
        }

        self.on('close', function (removed: any, done: () => any) {
            if (removed) {
                // This node has been deleted
                self.host.destroy()
            } else {
                // This node is being restarted
                self.host.unpublish()
                self.published = false
            }

            done()
        })

        self.host.on('identify', function (paired: any, callback: () => any) {
            if (paired) {
                logDebug(`Identify called on paired ${hostTypeName}`)
            } else {
                logDebug(`Identify called on unpaired ${hostTypeName}`)
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

    const macify = (nodeId: string) => {
        if (nodeId) {
            const noDecimalStr = nodeId.replace('.', '')
            const paddedStr = noDecimalStr.padEnd(12, '0')

            const match = paddedStr.match(/.{1,2}/g)

            if (match) {
                return match.join(':').substr(0, 17).toUpperCase()
            } else {
                throw Error(
                    `match failed in macify process for padded string ${paddedStr}`
                )
            }
        } else {
            throw Error('nodeId cannot be empty in macify process')
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
