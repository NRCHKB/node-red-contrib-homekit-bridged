module.exports = function(RED) {
    const HapNodeJS = require("hap-nodejs");
    const Bridge = HapNodeJS.Bridge;
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;
    const uuid = HapNodeJS.uuid;

    const init = function (config) {
        RED.nodes.createNode(this, config);

        const self = this;

        this.name = config.bridgeName;
        this.debug("Setting name to " + config.bridgeName);

        this.pinCode = config.pinCode;
        this.port = config.port;
        this.allowInsecureRequest = config.allowInsecureRequest || false;

        this.manufacturer = config.manufacturer;
        this.serialNo = config.serialNo;
        this.model = config.model;

        this.accessoryType = Accessory.Categories.BRIDGE;
        this.published = false;
        this.bridgeUsername = macify(this.id);
        const bridgeUUID = uuid.generate(this.id);

        this.debug(
            "Creating Bridge with name '" +
            this.name +
            "' and UUID '" +
            bridgeUUID +
            "'"
        );

        let bridge = new Bridge(this.name, bridgeUUID);

        this.publish = function () {
            self.debug(
                "publishing bridge with name '" +
                self.name +
                "', pin code '" +
                self.pinCode +
                "' and " +
                bridge.bridgedAccessories.length +
                " accessories."
            );

            bridge.publish(
                {
                    username: self.bridgeUsername,
                    port: self.port,
                    pincode: self.pinCode,
                    category: self.accessoryType
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
                this.published = false;
            }
            done();
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
