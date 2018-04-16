module.exports = function (RED) {
  'use strict'
  var API = require('./lib/api.js')(RED)
  var HapNodeJS = require('hap-nodejs')
  var Bridge = HapNodeJS.Bridge
  var Accessory = HapNodeJS.Accessory
  var Service = HapNodeJS.Service
  var Characteristic = HapNodeJS.Characteristic
  var uuid = HapNodeJS.uuid

  Service.prototype.setCharacteristicWithContext = function(name, value, context) {
    this.getCharacteristic(name).setValue(value, null, context);
    return this; // for chaining
  }
  
  // Initialize our storage system
  if (RED.settings.available()) {
    var userDir = RED.settings.userDir
    HapNodeJS.init(userDir + '/homekit-persist')
  } else {
    HapNodeJS.init()
  }

      // Initialize API
  API.init()

  function HAPBridgeNode (n) {
    RED.nodes.createNode(this, n)

    var self = this

    this.name = n.bridgeName
    this.debug("Setting name to " + n.bridgeName)
    this.pinCode = n.pinCode
    this.port = n.port
    this.manufacturer = n.manufacturer
    this.serialNo = n.serialNo
    this.model = n.model
    this.accessoryType = Accessory.Categories.BRIDGE

    var bridgeUUID = uuid.generate(this.id)
    this.bridgeUsername = macify(this.id)

    this.debug("Creating Bridge with name '" + this.name + "' and UUID '" + bridgeUUID + "'")
    var bridge = new Bridge(this.name, bridgeUUID)

    this.publish = function() {
      this.debug("publishing bridge with name '" + this.name + "' and pin code '" + this.pinCode + "'")
	    bridge.publish({
        username: this.bridgeUsername,
        port: this.port,
        pincode: this.pinCode,
        category: this.accessoryType
      })
      this.published = true
    }

    bridge.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
      .setCharacteristic(Characteristic.Model, this.model)

    this.published = false
    this.on('close', function (removed, done) {
      if (removed) {
        // This node has been deleted
        bridge.destroy()
      } else {
        // This node is being restarted
        bridge = null
      }
      done()
    })
    this.bridge = bridge
  }
  RED.nodes.registerType('homekit-bridge', HAPBridgeNode)

  function HAPServiceNode (n) {
    RED.nodes.createNode(this, n)

    // service node properties
    this.bridgeNode = RED.nodes.getNode(n.bridge)
    this.name = n.name
    this.serviceName = n.serviceName
    this.manufacturer = n.manufacturer
    this.serialNo = n.serialNo
    this.model = n.model
    this.accessoryType = n.accessoryType

    if (n.characteristicProperties && n.characteristicProperties.length > 0) {
      this.characteristicProperties = JSON.parse(n.characteristicProperties);
    } else {
      this.characteristicProperties = {};
    }

    var bridge = this.bridgeNode.bridge

    // generate UUID from node id
    var subtypeUUID = uuid.generate(this.id)
    var accessoryUUID = uuid.generate('A'+this.id)

    // create accessory object
    var accessory = new Accessory(this.name, accessoryUUID)
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
      .setCharacteristic(Characteristic.Model, this.model)

    bridge.addBridgedAccessory(accessory)
    this.debug("Bridge now has " + bridge.bridgedAccessories.length + " accessories.")

    // add service
    var service = null;
    var newService = new Service[this.serviceName](this.name, subtypeUUID);
    
    for (var i in accessory.services) {
      var existingService = accessory.services[i];
      if (newService.UUID == existingService.UUID && newService.subtype == existingService.subtype) {
        service = existingService;
        service.getCharacteristic(Characteristic.Name).setValue(this.name);
        break;
      }
    }

    if (!service) {
      service = accessory.addService(newService);
    }

    // configure custom characteristic properties
    for (var key in this.characteristicProperties) {
      var characteristic = service.getCharacteristic(Characteristic[key]);
      if (characteristic && this.characteristicProperties[key]) {
        characteristic.setProps(this.characteristicProperties[key]);
      }
    }

    // publish accessory after the service has been added
    if (!this.bridgeNode.published) {
      this.bridgeNode.publish()
    }

    this.service = service
    var node = this

    // the pinCode should be shown to the user until interaction with
    // iOS client starts
    node.status({fill: 'yellow', shape: 'ring', text: node.bridgeNode.pinCode})

    // emit message when value changes
    service.on('characteristic-change', function (info) {
      var msg = { payload: {}, hap: info, name: node.name }
      var key = info.characteristic.displayName.replace(/ /g, '')
      msg.payload[key] = info.newValue
      node.status({fill: 'yellow', shape: 'dot', text: key + ': ' + info.newValue})
      setTimeout(function () { node.status({}) }, 3000)
      node.send(msg)
    })

    // which characteristics are supported?
    var supported = { read: [], write: []}

    var allCharacteristics = service.characteristics.concat(service.optionalCharacteristics)
    allCharacteristics.map(function (characteristic, index) {
      var cKey = characteristic.displayName.replace(/ /g, '')
      if (characteristic.props.perms.indexOf('pw') > -1) {
        supported.read.push(cKey)
      }
      if ((characteristic.props.perms.indexOf('pr') + characteristic.props.perms.indexOf('ev')) > -2) {
        supported.write.push(cKey)
      }

      //Allow for negative temperatures
      if (characteristic.displayName == 'Current Temperature') {
        characteristic.props.minValue = -100;
      }
    })

    // respond to inputs
    this.on('input', function (msg) {
      if (msg.hasOwnProperty('payload')) {
        // payload must be an object
        var type = typeof msg.payload
        if (type != 'object') {
          node.warn('Invalid payload type: ' + type)
          return
        }
      } else {
        node.warn('Invalid message (payload missing)')
        return
      }
      
      var context = null;
      if (msg.payload.hasOwnProperty('Context')) {
        context = msg.payload.Context;
        delete msg.payload.Context;
      }
      
      // iterate over characteristics to be written
      Object.keys(msg.payload).map(function (key, index) {
        if (supported.write.indexOf(key) < 0) {
          // characteristic is not supported
          node.warn('Characteristic ' + key + ' cannot be written.\nTry one of these: ' + supported.write.join(', '))
        } else {
          if (context !== null) {
            service.setCharacteristicWithContext(Characteristic[key], (msg.payload[key]), context)
          } else {
            service.setCharacteristic(Characteristic[key], (msg.payload[key]))
          }
        }
      })
    })

    this.on('close', function (removed, done) {
      if (removed) {
        // This node has been deleted
        accessory.removeService(service)
        accessory.destroy()
      } else {
        accessory = null
        // This node is being restarted
      }
      done()
    })

    this.accessory = accessory
  }
  RED.nodes.registerType('homekit-service', HAPServiceNode)
}

function pad (str, length) {
  return (str.length < length) ? pad('0' + str, length) : str
}

function macify (nodeId) {
  var noDecimalStr = nodeId.replace('.', '')
  var paddedStr = pad(noDecimalStr, 16)
  var macifiedStr = paddedStr.match(/.{1,2}/g).join(':')
  return macifiedStr
}
