module.exports = function(RED) {
    ("use strict");

    const HapNodeJS = require("hap-nodejs");
    const Service = HapNodeJS.Service;
    const API = require("./lib/api.js")(RED);
    const HAPBridgeNode = require("./lib/HAPBridgeNode.js")(RED);
    const HAPServiceNode = require("./lib/HAPServiceNode.js")(RED);
    const BadgeGenerator = require("./lib/badge/BadgeGenerator.js")(RED);

    // Initialize our storage system
    if (RED.settings.available()) {
        const userDir = RED.settings.userDir;
        HapNodeJS.init(userDir + "/homekit-persist");
    } else {
        HapNodeJS.init();
    }

    // Initialize API
    API.init();

    // Start QRCode Badge Generator
    BadgeGenerator.start();

    RED.nodes.registerType("homekit-bridge", HAPBridgeNode.init);
    RED.nodes.registerType("homekit-service", HAPServiceNode.init);
};
