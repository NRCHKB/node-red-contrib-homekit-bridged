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

module.exports = (RED: NodeAPI, hostType: HostType) => {
    const debug = require('debug')('NRCHKB:HAPHostNode')

    const MdnsUtils = require('./utils/MdnsUtils')()

    const init = function (this: HAPHostNodeType, config: HAPHostConfigType) {
        const self = this
        self.hostType = hostType
        RED.nodes.createNode(self, config)

        self.config = config

        self.name = config.bridgeName
        debug('Setting name to ' + config.bridgeName)

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

        self.accessoryType =
            self.hostType == HostType.BRIDGE
                ? HapCategories.BRIDGE
                : config.accessoryType

        self.published = false
        self.bridgeUsername = macify(self.id)
        const hostUUID = uuid.generate(self.id)

        const hostTypeName =
            self.hostType == HostType.BRIDGE ? 'Bridge' : 'Standalone Accessory'

        debug(
            'Creating ' +
                hostTypeName +
                " with name '" +
                self.name +
                "' and UUID '" +
                hostUUID +
                "'"
        )

        if (self.hostType == HostType.BRIDGE) {
            self.host = new Bridge(self.name, hostUUID)
        } else {
            self.host = new Accessory(self.name, hostUUID)
        }

        self.publish = function () {
            debug(
                'Publishing ' +
                    hostTypeName +
                    " with name '" +
                    self.name +
                    "', pin code '" +
                    self.config.pinCode +
                    (self.hostType == HostType.BRIDGE
                        ? "' and " +
                          self.host.bridgedAccessories.length +
                          ' accessories.'
                        : '.')
            )

            if (
                (self.config.port && self.config.port == 1880) ||
                (self.mdnsConfig?.port && self.mdnsConfig?.port == 1880)
            ) {
                self.error(
                    'Cannot publish ' +
                        hostTypeName +
                        " '" +
                        self.name +
                        "' on port 1880 as it is reserved for node-red."
                )
                self.published = false
                return false
            }

            self.host.publish(
                {
                    username: self.bridgeUsername,
                    port: self.config.port,
                    pincode: self.config.pinCode,
                    category: (self.accessoryType as unknown) as Categories,
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
                debug(
                    'Identify called on paired ' +
                        hostTypeName +
                        ' ' +
                        self.name
                )
            } else {
                debug(
                    'Identify called on unpaired ' +
                        hostTypeName +
                        ' ' +
                        self.name
                )
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
                throw new Error(
                    'match failed in macify process for padded string ' +
                        paddedStr
                )
            }
        } else {
            throw new Error('nodeId cannot be empty in macify process')
        }
    }

    return {
        init,
        macify,
    }
}
