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
//            const cKey = characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");           

            // default send message to node output when characteristic change
            characteristic.on('change', function(value) {
                const msg = {payload:{}};
                const key = this.displayName;
                const oldValue = value.oldValue
                const newValue = value.newValue
                msg.payload[key] = {"oldValue":oldValue, "newValue":newValue};
                node.send([null,null,msg]);
            });

            // send message to node output when "get" event and only if characteristic has PAIRED_READ (pr)
            if (characteristic.props.perms.indexOf("pr") > -1) {
                characteristic.on('get', function(callback) {
                    const msg = {payload:{}};
                    const key = this.displayName;
                    msg["payload"] = {key:this.value};
                    node.send(msg,null,null);
                    callback([null, this.value]);
                });
            };

            // send message to node output when "set" event and only if characteristic has PAIRED_WRITE (pw)
            if (characteristic.props.perms.indexOf("pw") > -1) {
                characteristic.on('set', function(newVal, callback) {
                    const msg = {payload:{}};
                    const key = this.displayName;
                    msg["payload"] = {key:newVal};
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
