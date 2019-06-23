module.exports = function(node) {
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
        debug("Looking for accessory with UUID '" + accessoryInformation.UUID + "'...");

        for (let i in bridge.bridgedAccessories) {
            if (!bridge.bridgedAccessories.hasOwnProperty(i)) {
                continue;
            }

            const existingAccessory = bridge.bridgedAccessories[i];

            if (existingAccessory.UUID === accessoryInformation.UUID) {
                accessory = existingAccessory;
                break;
            } else {
                debug("Accessory with UUID '" + existingAccessory.UUID + "' doesn't match '" + accessoryInformation.UUID + "'");
            }
        }

        if (!accessory) {
            debug(
                "... didn't find it. Adding new accessory with name '" +
                accessoryInformation.name +
                "' and UUID '" +
                accessoryInformation.UUID +
                "' and category '" +
                accessoryInformation.category + ":" + HapNodeJS.Accessory.Categories[accessoryInformation.category] +
                "'"
            );
            accessory = new Accessory(accessoryInformation.name, accessoryInformation.UUID, HapNodeJS.Accessory.Categories[accessoryInformation.category]);
            bridge.addBridgedAccessories([accessory]);
        } else {
            debug("... found it! Updating it.");
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

        debug(
            "Bridge now has " + bridge.bridgedAccessories.length + " accessories."
        );

        return accessory;
    };

    const onIdentify = function(paired, callback) {
        if (paired) {
            debug("Identify called on paired Accessory " + node.accessory.displayName);
        } else {
            debug("Identify called on unpaired Accessory " + node.accessory.displayName);
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
