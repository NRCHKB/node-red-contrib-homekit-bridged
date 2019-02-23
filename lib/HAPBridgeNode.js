module.exports = function(RED) {
  var HapNodeJS = require("hap-nodejs");
  var Bridge = HapNodeJS.Bridge;
  var Accessory = HapNodeJS.Accessory;
  var Service = HapNodeJS.Service;
  var Characteristic = HapNodeJS.Characteristic;
  var uuid = HapNodeJS.uuid;

  var init = function(config) {
    RED.nodes.createNode(this, config);

    var self = this;

    this.name = config.bridgeName;
    this.debug("Setting name to " + config.bridgeName);

    this.pinCode = config.pinCode;
    this.port = config.port;
    this.allowInsecureRequest = config.allowInsecureRequest || false;

    this.manufacturer = config.manufacturer;
    this.serialNo = config.serialNo;
    this.model = config.model;

    this.accessoryType = Accessory.Categories.BRIDGE;
    this.published = false;
    this.bridgeUsername = macify(this.id);
    var bridgeUUID = uuid.generate(this.id);

    this.debug(
      "Creating Bridge with name '" +
        this.name +
        "' and UUID '" +
        bridgeUUID +
        "'"
    );

    var bridge = new Bridge(this.name, bridgeUUID);

    this.publish = function() {
      self.debug(
        "publishing bridge with name '" +
          self.name +
          "', pin code '" +
          self.pinCode +
          "' and " +
          bridge.bridgedAccessories.length +
          " accessories."
      );

      bridge.publish(
        {
          username: self.bridgeUsername,
          port: self.port,
          pincode: self.pinCode,
          category: self.accessoryType
        },
        self.allowInsecureRequest
      );

      self.published = true;
    };

    this.on("close", function(removed, done) {
      if (removed) {
        // This node has been deleted
        bridge.destroy();
      } else {
        // This node is being restarted
        bridge.unpublish();
        bridge = null;
        this.published = false;
      }
      done();
    });

    bridge
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
      .setCharacteristic(Characteristic.Model, this.model);

    this.bridge = bridge;
  };

  return {
    init: init
  };
};

function macify(nodeId) {
  var noDecimalStr = nodeId.replace(".", "");
  var paddedStr = noDecimalStr.padStart(16, "0");
  var macifiedStr = paddedStr.match(/.{1,2}/g).join(":");
  return macifiedStr;
}
