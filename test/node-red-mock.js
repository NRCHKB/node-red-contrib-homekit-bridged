const CONFIG = {};
CONFIG.bridgeName = "bridgeName";
CONFIG.pinCode = "pinCode";
CONFIG.port = "port";
CONFIG.allowInsecureRequest = "allowInsecureRequest";
CONFIG.manufacturer = "manufacturer";
CONFIG.serialNo = "serialNo";
CONFIG.model = "model";
CONFIG.name = "name";
CONFIG.serviceName = "Lightbulb";
CONFIG.masterService = "MasterService";

module.exports = {
    RED: {
        settings: {
            available: function() {
                return false;
            }
        },
        httpAdmin: {
            get: function() {}
        },
        auth: {
            needsPermission: function() {}
        },
        nodes: {
            registerType: function(name, init) {
                init(CONFIG);
            },
            createNode: function(node) {
                node.id = "id";
                node.log = function() {};
                node.on = function() {};
                node.status = function() {};
                node.debug = function() {};
            },
            getNode: function() {
                let node = {
                    publish: function () {
                    }
                };
                node.bridge = { addBridgedAccessories: function() {} };
                node.bridge.bridgedAccessories = { 0: "0" };
                node.service = {
                    addLinkedService: function() {}
                };
                node.accessory = {
                    addService: function(service) {
                        return service;
                    }
                };
                node.accessory.services = {};
                node.bridgeNode = node;
                return node;
            }
        }
    }
};