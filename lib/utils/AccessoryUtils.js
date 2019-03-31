module.exports = function(RED, node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;

    /**
     * accessoryInformation
     *  name
     *  UUID
     *  manufacturer
     *  serialNo
     *  model
     */
    const getOrCreate = function (bridge, accessoryInformation) {
        let accessory = null;

        // create accessory object
        debug(RED._("homekit.accessory.looking_for"), accessoryInformation.UUID);

        for (let i in bridge.bridgedAccessories) {
            if (!bridge.bridgedAccessories.hasOwnProperty(i)) {
                continue;
            }

            const existingAccessory = bridge.bridgedAccessories[i];

            if (existingAccessory.UUID === accessoryInformation.UUID) {
                accessory = existingAccessory;
                break;
            } else {
                debug(RED._("homekit.accessory.not_match"), existingAccessory.UUID, accessoryInformation.UUID);
            }
        }

        if (!accessory) {
            debug(RED._("homekit.accessory.not_find_adding"), accessoryInformation.name, accessoryInformation.UUID);
            accessory = new Accessory(accessoryInformation.name, accessoryInformation.UUID);
            bridge.addBridgedAccessories([accessory]);
        } else {
            debug(RED._("homekit.accessory.found"));
            accessory
                .getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Name, accessoryInformation.name);
        }

        accessory
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, accessoryInformation.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, accessoryInformation.serialNo)
            .setCharacteristic(Characteristic.Model, accessoryInformation.model)
            .setCharacteristic(Characteristic.Identify, true);

        debug(RED._("homekit.bridge.now_has_x_accessories"), bridge.bridgedAccessories.length);

        return accessory;
    };

    const onIdentify = function(paired, callback) {
        if (paired) {
            debug(RED._("homekit.accessory.identify_called_on_paired"), node.accessory.displayName);
        } else {
            debug(RED._("homekit.accessory.identify_called_on_unpaired"), node.accessory.displayName);
        }

        let nodes = node.childNodes;

        for (let i = 0, len = nodes.length; i < len; i++) {
            const topic = nodes[i].topic ? nodes[i].topic : nodes[i].topic_in;
            const msg = {payload: {Identify: 1}, name: nodes[i].name, topic: topic};

            nodes[i].status({
                fill: "yellow",
                shape: "dot",
                text: "Identify : 1"
            });

            setTimeout(function () {
                nodes[i].status({});
            }, 3000);

            nodes[i].send(msg);
        }
        callback();
    };

    return {
        getOrCreate: getOrCreate,
        onIdentify: onIdentify
    };
};
