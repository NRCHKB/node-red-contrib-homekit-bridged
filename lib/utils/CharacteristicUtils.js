module.exports = function(node) {
    ("use strict");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;

    const load = function (service, config) {
        let characteristicProperties = {};

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            characteristicProperties = JSON.parse(config.characteristicProperties);

            // Configure custom characteristic properties
            for (let key in characteristicProperties) {
                if (!characteristicProperties.hasOwnProperty(key)) continue;

                const characteristic = service.getCharacteristic(Characteristic[key]);

                if (characteristic && characteristicProperties[key]) {
                    characteristic.setProps(characteristicProperties[key]);
                }
            }
        }

        return characteristicProperties;
    };

    const getSupportedAndSubscribeSet = function (service) {
        const supported = {read: [], write: []};

        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );

        allCharacteristics.map(function (characteristic, index) {
            const cKey = characteristic.displayName
                .replace(/ /g, "")
                .replace(/\./g, "_");
            if (characteristic.props.perms.indexOf("pw") > -1) {
                supported.read.push(cKey);
            }

            if (
                characteristic.props.perms.indexOf("pr") +
                characteristic.props.perms.indexOf("ev") >
                -2
            ) {
                supported.write.push(cKey);
                
                // Subscribe to 'set' event of writable characteristic
                characteristic.on("set", function(newVal, callback) {
                    callback(node.accessory.reachable === false ? "no response" : null);
                });
            }

            //Allow for negative temperatures
            if (characteristic.displayName === "Current Temperature") {
                characteristic.props.minValue = -100;
            }
        });

        return supported;
    };

    return {
        load: load,
        getSupportedAndSubscribeSet: getSupportedAndSubscribeSet
    };
};
