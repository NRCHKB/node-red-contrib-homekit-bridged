module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;

    const initAllCharacteristics = function (node, service, config) {
        let supported = {};
        let characteristicProperties = JSON.parse(config.characteristicProperties);
        let requiredCharacteristics = service.characteristics;
        let optionalCharacteristics = service.optionalCharacteristics;

        // Add listener, init value and add to support list for all required characteristics
        for (let key in requiredCharacteristics) {
            // add event listener for all required characterisic
            addListener(node, requiredCharacteristics[key]);

            // load characteristic property if it is available
            if ( characteristicProperties.hasOwnProperty(key) ){
                for (let i in characteristicProperties[key]){
                    debugger;
                    loadInitCharacteristicProperty(requiredCharacteristics[key], characteristicProperties[key].i);
                };
            }
                        
            // add characteriestic to support list for node.input it has perms of PAIRED_READ and/or "NOTIFY"
            if (requiredCharacteristic.props.perms.indexOf("pr") + requiredCharacteristic.props.perms.indexOf("ev") > -2 ) {
                supported.push(requiredCharacteristic.displayName.replace(/ /g, "").replace(/\./g, "_"));
            }
        };

        for (let key in optionalCharacteristics){
            if ( characteristicProperties.hasOwnProperty(key) ){
                // get to create the characterisic from optional characteristic
                let characteristic = service.getCharacteristic(Characteristic[key]);
                
                // init with value and/or props
                for (let index in characteristicProperties[key]){
                    loadInitCharacteristicProperty(characteristic, characteristicProperties[key].index);
                };
                
                // add listener only if it has been initialized
                addListener(node, characteristic);
                
                // add supported to support list only if it has been initialized, and has perms of PAIRED_READ and/or "NOTIFY"
                if (characteristic.props.perms.indexOf("pr") + characteristic.props.perms.indexOf("ev") > -2 ) {
                    supported.push(optionalCharacteristics.displayName.replace(/ /g, "").replace(/\./g, "_"));
                }     
            } 
        };
        
        return supported
    };
    
    // load characteristic property
    const loadInitCharacteristicProperty = function (characteristic, initProperty){
        if (typeof initProperty === 'object') {
            characteristic.setProps(initProperty);
        } else {
            characteristic.setValue(initProperty);
        }
    };
    
    
    // add event listener based on the perms of characteristic. 
    const addListener = function (node, characteristic) {
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
    };
        
/*
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
//        const allCharacteristics = service.characteristics.concat( service.optionalCharacteristics );
        const allCharacteristics = service.characteristics;

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
*/
        
    return {
        initAllCharacteristics: initAllCharacteristics,
//        loadCharacteristicProperties: loadCharacteristicProperties,
//        getSupported: getSupported,
//        addCharacteristicListener: addCharacteristicListener
    };
};
