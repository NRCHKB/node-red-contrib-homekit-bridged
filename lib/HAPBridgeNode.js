module.exports = function(RED) {
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Bridge = HapNodeJS.Bridge;
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;
    const uuid = HapNodeJS.uuid;

    const MdnsUtils = require("./utils/MdnsUtils.js")();

    const init = function (config) {
        RED.nodes.createNode(this, config);

        const self = this;

        this.name = config.bridgeName;
        debug("Setting name to " + config.bridgeName);

        this.pinCode = config.pinCode;
        this.port = config.port;
        this.allowInsecureRequest = config.allowInsecureRequest || false;

        this.manufacturer = config.manufacturer;
        this.serialNo = config.serialNo;
        this.model = config.model;

        if (config.customMdnsConfig) {
            this.mdnsConfig = {};

            if (MdnsUtils.checkMulticast(config.mdnsMulticast)) {
                this.mdnsConfig.multicast = config.mdnsMulticast;
            }

            if (MdnsUtils.checkInterface(config.mdnsInterface)){
                this.mdnsConfig.interface = config.mdnsInterface;
            }

            if (MdnsUtils.checkPort(config.mdnsPort)){
                this.mdnsConfig.port = parseInt(config.mdnsPort);
            }

            if(MdnsUtils.checkIp(config.mdnsIp)){
                this.mdnsConfig.ip = config.mdnsIp;
            }

            if (MdnsUtils.checkTtl(config.mdnsTtl)) {
                this.mdnsConfig.ttl = parseInt(config.mdnsTtl);
            }

            if (MdnsUtils.checkLoopback(config.mdnsLoopback)){
                this.mdnsConfig.loopback = config.mdnsLoopback;
            }

            if (MdnsUtils.checkReuseAddr(config.mdnsReuseAddr)){
                this.mdnsConfig.reuseAddr = config.mdnsReuseAddr;
            }
        }

        this.accessoryType = Accessory.Categories.BRIDGE;
        this.published = false;
        this.bridgeUsername = macify(this.id);
        const bridgeUUID = uuid.generate(this.id);

        debug(
            "Creating Bridge with name '" +
            this.name +
            "' and UUID '" +
            bridgeUUID +
            "'"
        );

        let bridge = new Bridge(this.name, bridgeUUID);

        this.publish = function () {
            debug(
                "publishing bridge with name '" +
                self.name +
                "', pin code '" +
                self.pinCode +
                "' and " +
                bridge.bridgedAccessories.length +
                " accessories."
            );

            for (let i = 0, len = bridge.bridgedAccessories.length; i < len; i++) {
                if (bridge.bridgedAccessories[i].cameraSource) {
                    debug("Paired Camera from Accessory " + bridge.bridgedAccessories[i].displayName + " to Bridge " + bridge.displayName);
                    bridge.cameraSource = bridge.bridgedAccessories[i].cameraSource;
                    break;
                }
            }

            bridge.publish(
                {
                    username: self.bridgeUsername,
                    port: self.port,
                    pincode: self.pinCode,
                    category: self.accessoryType,
                    mdns: self.mdnsConfig
                },
                self.allowInsecureRequest
            );

            self.published = true;
        };

        this.on("close", function (removed, done) {
            if (removed) {
                // This node has been deleted
                bridge.destroy();
            } else {
                // This node is being restarted
                bridge.unpublish();
                bridge = null;
                self.published = false;
            }

            done();
        });

        bridge.on("identify", function(paired, callback) {
            if (paired) {
                debug("Identify called on paired Bridge " + self.name);
            } else {
                debug("Identify called on unpaired Bridge " + self.name);
            }

            callback();
        });

        bridge
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
            .setCharacteristic(Characteristic.Model, this.model);

        this.bridge = bridge;
    };

    return {
        init: init
    };
};

function macify(nodeId) {
    const noDecimalStr = nodeId.replace(".", "");
    const paddedStr = noDecimalStr.padStart(16, "0");
    return paddedStr.match(/.{1,2}/g).join(":");
}
