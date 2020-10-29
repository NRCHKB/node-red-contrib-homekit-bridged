import { NodeAPI } from 'node-red'
import HAPBridgeConfigType from './types/HAPBridgeConfigType'
import HAPBridgeNodeType from './types/HAPBridgeNodeType'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('NRCHKB:HAPBridgeNode')
    const HapNodeJS = require('hap-nodejs')
    const Bridge = HapNodeJS.Bridge
    const Categories = HapNodeJS.Categories
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic
    const uuid = HapNodeJS.uuid

    const MdnsUtils = require('./utils/MdnsUtils')()

    const init = function(this: HAPBridgeNodeType, config: HAPBridgeConfigType) {
        RED.nodes.createNode(this, config)

        this.config = config

        this.name = config.bridgeName
        debug('Setting name to ' + config.bridgeName)

        this.pinCode = config.pinCode
        this.port = config.port
        this.allowInsecureRequest =
            config.allowInsecureRequest !== undefined
                ? config.allowInsecureRequest
                : false

        this.allowMessagePassthrough =
            config.allowMessagePassthrough !== undefined
                ? config.allowMessagePassthrough
                : false

        this.manufacturer = config.manufacturer
        this.serialNo = config.serialNo
        this.model = config.model
        this.firmwareRev = config.firmwareRev ? config.firmwareRev : '0.0.0'
        this.hardwareRev = config.hardwareRev
        this.softwareRev = config.softwareRev

        if (config.customMdnsConfig) {
            this.mdnsConfig = {}

            if (MdnsUtils.checkMulticast(config.mdnsMulticast)) {
                this.mdnsConfig.multicast = config.mdnsMulticast
            }

            if (MdnsUtils.checkInterface(config.mdnsInterface)) {
                this.mdnsConfig.interface = config.mdnsInterface
            }

            if (MdnsUtils.checkPort(config.mdnsPort)) {
                this.mdnsConfig.port = parseInt(config.mdnsPort.toString())
            }

            if (MdnsUtils.checkIp(config.mdnsIp)) {
                this.mdnsConfig.ip = config.mdnsIp
            }

            if (MdnsUtils.checkTtl(config.mdnsTtl)) {
                this.mdnsConfig.ttl = parseInt(config.mdnsTtl.toString())
            }

            if (MdnsUtils.checkLoopback(config.mdnsLoopback)) {
                this.mdnsConfig.loopback = config.mdnsLoopback
            }

            if (MdnsUtils.checkReuseAddr(config.mdnsReuseAddr)) {
                this.mdnsConfig.reuseAddr = config.mdnsReuseAddr
            }
        }

        this.accessoryType = Categories.BRIDGE
        this.published = false
        this.bridgeUsername = macify(this.id)
        const bridgeUUID = uuid.generate(this.id)

        debug(
            'Creating Bridge with name \'' +
            this.name +
            '\' and UUID \'' +
            bridgeUUID +
            '\'',
        )

        let bridge = new Bridge(this.name, bridgeUUID)

        const self = this
        this.publish = function() {
            debug(
                'Publishing bridge with name \'' +
                self.name +
                '\', pin code \'' +
                self.pinCode +
                '\' and ' +
                bridge.bridgedAccessories.length +
                ' accessories.',
            )

            if (((self.port && self.port == 1880) || (self.mdnsConfig?.port && self.mdnsConfig?.port == 1880))) {
                self.error('Cannot publish Bridge \'' + self.name + '\' on port 1880 as it is reserved for node-red.')
                self.published = false
                return false
            }

            for (
                let i = 0, len = bridge.bridgedAccessories.length;
                i < len;
                i++
            ) {
                if (bridge.bridgedAccessories[i].cameraSource) {
                    debug(
                        'Paired Camera from Accessory ' +
                        bridge.bridgedAccessories[i].displayName +
                        ' to Bridge ' +
                        bridge.displayName,
                    )
                    bridge.cameraSource =
                        bridge.bridgedAccessories[i].cameraSource
                    break
                }
            }

            bridge.publish(
                {
                    username: self.bridgeUsername,
                    port: self.port,
                    pincode: self.pinCode,
                    category: self.accessoryType,
                    mdns: self.mdnsConfig,
                },
                self.allowInsecureRequest,
            )

            self.published = true

            return true
        }

        this.on('close', function(removed: any, done: () => any) {
            if (removed) {
                // This node has been deleted
                bridge.destroy()
            } else {
                // This node is being restarted
                bridge.unpublish()
                bridge = null
                self.published = false
            }

            done()
        })

        bridge.on('identify', function(paired: any, callback: () => any) {
            if (paired) {
                debug('Identify called on paired Bridge ' + self.name)
            } else {
                debug('Identify called on unpaired Bridge ' + self.name)
            }

            callback()
        })

        bridge
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRev)
            .setCharacteristic(Characteristic.HardwareRevision, this.hardwareRev)
            .setCharacteristic(Characteristic.SoftwareRevision, this.softwareRev)

        this.bridge = bridge
    }

    const macify = (nodeId: string) => {
        if (nodeId) {
            const noDecimalStr = nodeId.replace('.', '')
            const paddedStr = noDecimalStr.padEnd(12, '0')

            const match = paddedStr.match(/.{1,2}/g)

            if (match) {
                return match
                    .join(':')
                    .substr(0, 17)
                    .toUpperCase()
            } else {
                throw new Error('match failed in macify process for padded string ' + paddedStr)
            }
        } else {
            throw new Error('nodeId cannot be empty in macify process')
        }
    }

    return {
        init,
        macify
    }
}
