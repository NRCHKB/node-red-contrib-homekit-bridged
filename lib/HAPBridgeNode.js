var HapNodeJS = require("hap-nodejs");
var Bridge = HapNodeJS.Bridge;
var Accessory = HapNodeJS.Accessory;
var Service = HapNodeJS.Service;
var Characteristic = HapNodeJS.Characteristic;
var uuid = HapNodeJS.uuid;

module.exports = function(RED) {
  var init = function(n) {
    RED.nodes.createNode(this, n);
    var self = this;
    this.name = n.bridgeName;
    this.debug("Setting name to " + n.bridgeName);
    this.pinCode = n.pinCode;
    this.port = n.port;
    this.manufacturer = n.manufacturer;
    this.serialNo = n.serialNo;
    this.model = n.model;
    this.allowInsecureRequest = n.allowInsecureRequest || false;
    this.accessoryType = Accessory.Categories.BRIDGE;
    var bridgeUUID = uuid.generate(this.id);
    this.bridgeUsername = macify(this.id);
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
    bridge
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
      .setCharacteristic(Characteristic.Model, this.model);
    this.published = false;
    this.on("close", function(removed, done) {
      if (removed) {
        // This node has been deleted
        bridge.destroy();
      } else {
        // This node is being restarted
        // no-so-nice workaround until there is another way
        // see https://github.com/KhaosT/HAP-NodeJS/issues/579
        bridge._server.stop();
        bridge._server = undefined;
        bridge._advertiser.stopAdvertising();
        bridge._advertiser = undefined;
        bridge = null;
        this.published = false;
      }
      done();
    });
    this.bridge = bridge;
  };

  return {
    init: init
  };
};

function pad(str, length) {
  return str.length < length ? pad("0" + str, length) : str;
}

function macify(nodeId) {
  var noDecimalStr = nodeId.replace(".", "");
  var paddedStr = pad(noDecimalStr, 16);
  var macifiedStr = paddedStr.match(/.{1,2}/g).join(":");
  return macifiedStr;
}
