module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;

    const loadCharacteristicProperties = function (service, config) {
        let characteristicProperties = {};

        if ( config.characteristicProperties && config.characteristicProperties.length > 0 ) {
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
        const supported = [];
        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );

        allCharacteristics.map(function (characteristic, index) {
            const cKey = characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");
            if (characteristic.props.perms.indexOf("pr") + characteristic.props.perms.indexOf("ev") > -2 ) {
                supported.push(cKey);
            }

//            if (characteristic.props.perms.indexOf("pw") > -1) {
//                supported.read.push(cKey);
//            }
        });
        return supported;
    };

    const addCharacteristicListener = function(service, node){
        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );
        
        allCharacteristics.map(function (characteristic) {
            const cKey = characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");           

            // default send message to node output when characteristic change
            characteristic.on('change', function(oldVal, newVal) {
                const msg = {};
                msg["payload"] = {cKey:[oldVal, newVal]};
                node.send(null,null,[msg]);
            });

            // send message to node output when "get" event and only if characteristic has PERMS.READ
            if (characteristic.props.perms.indexOf("pr") > -1) {
                characteristic.on('get', function(callback) {
                    const msg = {};
                    msg["payload"] = {cKey:characteristic[cKey].value};
                    node.send([msg],null,null);
                    callback(null, characteristic[cKey].value);
                });
            };

            // send message to node output when "set" event and only if characteristic has PERMS.WRITE
            if (characteristic.props.perms.indexOf("pw") > -1) {
                characteristic.on('set', function(newVal, callback) {
                    const msg = {};
                    msg["payload"] = {cKey:newVal};
                    node.send(null,[msg],null);
                    callback(null);
                });
            };
        });
    };
        
        
    return {
        loadCharacteristicProperties: loadCharacteristicProperties,
        getSupported: getSupported,
        addCharacteristicListener: addCharacteristicListener
    };
};
