module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;
    
    const initAllCharacteristics = function (node, service, config) {
        let supported = [];
        let characteristicProperties = JSON.parse(config.characteristicProperties);
        let requiredCharacteristics = service.characteristics;
        let optionalCharacteristics = service.optionalCharacteristics;

        // For all required characteristics, Add listener, init value and add to support list.
        for (let index in requiredCharacteristics) {
            const displayName = requiredCharacteristics[index].displayName.replace(/ /g, "").replace(/\./g, "_"); 
            
            // add event listener for all required characterisic
            addListener(node, requiredCharacteristics[index]);

            // load characteristic property if it is available
            if ( characteristicProperties.hasOwnProperty(displayName) ){
                loadInitCharacteristicProperty(characteristic, characteristicProperties[displayName]);
                delete characteristicProperties[displayName];                                                                         
            }
                        
            // add characteriestic to support list for node.input it has perms of PAIRED_READ and/or "NOTIFY"
            if (requiredCharacteristics[index].props.perms.indexOf("pr") + requiredCharacteristics[index].props.perms.indexOf("ev") > -2 ) {
                supported.push(displayName);
            }
        };

        //For all optionalCharacteristices, if characterisitic properties set, add listener, init and add to support list
        for (let index in optionalCharacteristics){
            const displayName = optionalCharacteristics[index].displayName.replace(/ /g, "").replace(/\./g, "_"); 
            
            // init an optional characterisitics only if it has been requested by characteristic properties
            if ( characteristicProperties.hasOwnProperty(displayName) ){
                // get to create the characterisic from optional characteristic
                let characteristic = service.getCharacteristic(displayName);
                
                // init with value and/or props
                loadInitCharacteristicProperty(characteristic, characteristicProperties[displayName]);
                delete characteristicProperties[displayName];   
                
                // add listener only if it has been initialized
                addListener(node, characteristic);
                
                // add supported to support list only if it has been initialized, and has perms of PAIRED_READ and/or "NOTIFY"
                if (characteristic.props.perms.indexOf("pr") + characteristic.props.perms.indexOf("ev") > -2 ) {
                    supported.push(displayName);
                }     
            } 
        };
        return supported
    };

    // load characteristic property
    function loadInitCharacteristicProperty(characteristic, initProperty){
        for (i=0; i < initProperty.length; i++){
            if (typeof initProperty[i] === null) {
                continue;
            } else if (typeof initProperty[i] === 'object') {
                characteristic.setProps(initProperty[i]);
            } else {
                characteristic.setValue(initProperty[i]);
            }
        }                                                                            
    };
    
    
    // add event listener based on the perms of characteristic. 
    function addListener(node, characteristic){
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
    
    
    return {
        initAllCharacteristics: initAllCharacteristics
    };
};
