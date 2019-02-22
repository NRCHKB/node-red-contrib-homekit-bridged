module.exports = function(RED) {
  "use strict";
  var HapNodeJS = require("hap-nodejs");
  var Service = HapNodeJS.Service;
  var API = require("./lib/api.js")(RED);
  var HAPBridgeNode = require("./lib/HAPBridgeNode.js")(RED);
  var HAPServiceNode = require("./lib/HAPServiceNode.js")(RED);

  Service.prototype.setCharacteristicWithContext = function(
    name,
    value,
    context
  ) {
    this.getCharacteristic(name).setValue(value, null, context);
    return this; // for chaining
  };

  // Initialize our storage system
  if (RED.settings.available()) {
    var userDir = RED.settings.userDir;
    HapNodeJS.init(userDir + "/homekit-persist");
  } else {
    HapNodeJS.init();
  }

  // Initialize API
  API.init();

  RED.nodes.registerType("homekit-bridge", HAPBridgeNode.init);
  RED.nodes.registerType("homekit-service", HAPServiceNode.init);
};
