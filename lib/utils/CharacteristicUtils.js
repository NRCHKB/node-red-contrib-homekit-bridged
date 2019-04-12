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
        });
        return supported;
    };

    const addCharacteristicListener = function(service, node){
        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );
        
        allCharacteristics.map(function (characteristic) {
            // send message to node output when "change" event and only if characteristic has NOTIFY (ev)
            if (characteristic.props.perms.indexOf("ev") > -1) {
                characteristic.on('change', function(value) {
                    const msg = {payload:{}};
                    msg.payload[this.displayName] = {"oldValue":value.oldValue, "newValue":value.newValue};
                    node.send([null,null,msg]);
                });
            };
            // send message to node output when "get" event and only if characteristic has PAIRED_READ (pr)
            if (characteristic.props.perms.indexOf("pr") > -1) {
                characteristic.on('get', function(callback) {
                    const msg = {payload:{}};
                    msg.payload[this.displayName] = this.value;
                    node.send([msg,null,null]);
                    callback(null, this.value);
                });
            };
            // send message to node output when "set" event and only if characteristic has PAIRED_WRITE (pw)
            if (characteristic.props.perms.indexOf("pw") > -1) {
                characteristic.on('set', function(newVal, callback) {
                    const msg = {payload:{}};
                    msg.payload[this.displayName] = newVal;
                    node.send([null,msg,null]);
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
