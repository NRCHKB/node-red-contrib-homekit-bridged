module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;

    const loadCharacteristicProperties = function (service, config) {
        let characteristicProperties = {};

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            characteristicProperties = JSON.parse(config.characteristicProperties);

            // Configure custom characteristic properties
            for (let key in characteristicProperties) {
                const characteristic = service.getCharacteristic(Characteristic[key]);
                if ( characteristic && characteristicProperties.hasOwnProperty(key) ){
                    if (typeof characteristicProperties[key] === 'object') {
                        characteristic.setProps(characteristicProperties[key]);
                    } else {
                        characteristic.setValue(characteristicProperties[key]);
                    }
                }
            }
        }
        return characteristicProperties;
    };

    const getSupported = function (service) {
        const supported = {read: [], write: []};
        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );

        allCharacteristics.map(function (characteristic, index) {
            const cKey = characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");
            if (characteristic.props.perms.indexOf("pr") > -1) {
                supported.read.push(cKey);
                // Subscribe to 'get' event of readable characteristic
//                characteristic.on("get", function(callback, context) {
//                   if (node.accessory.reachable === true) {
//                        callback(null, characteristic.value);
//                    } else {
//                        callback("no response", null);
//                    }
//                });
            }

            if (characteristic.props.perms.indexOf("pw") > -1) {
                supported.write.push(cKey);
                // Subscribe to 'set' event of writable characteristic
//                characteristic.on("set", function(newVal, callback) {
//                   callback(node.accessory.reachable === true ? null : "no response");
//                });
            }
        });
        return supported;
    };

    return {
        loadCharacteristicProperties: loadCharacteristicProperties,
        getSupported: getSupported
    };
};
