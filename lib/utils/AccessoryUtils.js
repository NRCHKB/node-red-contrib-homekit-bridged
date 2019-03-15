module.exports = function(node) {
    ("use strict");
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
        node.debug("Looking for accessory with UUID '" + accessoryInformation.UUID + "'...");

        for (let i in bridge.bridgedAccessories) {
            if (!bridge.bridgedAccessories.hasOwnProperty(i)) {
                continue;
            }

            const existingAccessory = bridge.bridgedAccessories[i];

            if (existingAccessory.UUID === accessoryInformation.UUID) {
                accessory = existingAccessory;
                break;
            } else {
                node.debug("Accessory with UUID '" + existingAccessory.UUID + "' doesn't match '" + accessoryInformation.UUID + "'");
            }
        }

        if (!accessory) {
            node.debug(
                "... didn't find it. Adding new accessory with name '" +
                accessoryInformation.name +
                "' and UUID '" +
                accessoryInformation.UUID +
                "'"
            );
            accessory = new Accessory(accessoryInformation.name, accessoryInformation.UUID);
            bridge.addBridgedAccessories([accessory]);
        } else {
            node.debug("... found it! Updating it.");
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

        node.debug(
            "Bridge now has " + bridge.bridgedAccessories.length + " accessories."
        );

        return accessory;
    };

    const onIdentify = function(paired, callback) {
        node.debug("Identify called on Accessory " + node.accessory.displayName);

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
