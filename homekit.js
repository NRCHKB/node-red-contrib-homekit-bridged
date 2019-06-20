module.exports = function (RED) {
    ("use strict");

    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Service = HapNodeJS.Service;
    const API = require("./lib/api.js")(RED);
    const HAPBridgeNode = require("./lib/HAPBridgeNode.js")(RED);
    const HAPServiceNode = require("./lib/HAPServiceNode.js")(RED);

    // Initialize our storage system
    if (RED.settings.available()) {
        debug("RED settings available");

        const userDir = RED.settings.userDir;
        HapNodeJS.init(userDir + "/homekit-persist");
    } else {
        debug("RED settings not available");

        HapNodeJS.init();
    }

    // Initialize API
    API.init();

    RED.nodes.registerType("homekit-bridge", HAPBridgeNode.init);
    RED.nodes.registerType("homekit-service", HAPServiceNode.init);
};
