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
            createNode: function(node, config) {
                node.id = "id";
                node.debug = function() {};
                node.on = function() {};
                node.status = function() {};
            },
            getNode: function() {
                const bridgeNode = {
                    publish: function () {
                    }
                };
                bridgeNode.bridge = { addBridgedAccessories: function() {} };
                bridgeNode.bridge.bridgedAccessories = { 0: "0" };
                return bridgeNode;
            }
        }
    }
};
