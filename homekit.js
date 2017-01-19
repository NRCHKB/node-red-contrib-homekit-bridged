module.exports = function (RED) {
  'use strict'
  var API = require('./lib/api.js')(RED)
  var HapNodeJS = require('hap-nodejs')
  var Accessory = HapNodeJS.Accessory
  var Service = HapNodeJS.Service
  var Characteristic = HapNodeJS.Characteristic
  var uuid = HapNodeJS.uuid

    // Initialize our storage system
  if (RED.settings.available()) {
    var userDir = RED.settings.userDir
    HapNodeJS.init(userDir + '/homekit-persist')
  } else {
    HapNodeJS.init()
  }

      // Initialize API
  API.init()

  function HAPAccessoryNode (n) {
    RED.nodes.createNode(this, n)

    // config node properties
    this.name = n.accessoryName
    this.pinCode = n.pinCode
    this.port = n.port
    this.manufacturer = n.manufacturer
    this.serialNo = n.serialNo
    this.model = n.model
    this.accessoryType = n.accessoryType

    // generate UUID and username (MAC-address) from node id
    var accessoryUUID = uuid.generate(this.id)
    var accessoryUsername = macify(this.id)

    // create accessory object
    var accessory = new Accessory(this.name, accessoryUUID)
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
      .setCharacteristic(Characteristic.Model, this.model)

    // publish accessory
    accessory.publish({
      username: accessoryUsername,
      pincode: this.pinCode,
      port: this.port || 0,
      category: this.accessoryType
    }, true)

    this.on('close', function () {
      accessory.destroy()
    })

    this.accessory = accessory
  }
  RED.nodes.registerType('homekit-accessory', HAPAccessoryNode)

  function HAPServiceNode (n) {
    RED.nodes.createNode(this, n)

    // service node properties
    this.name = n.name
    this.serviceName = n.serviceName
    this.configNode = RED.nodes.getNode(n.accessory)

    // generate UUID from node id
    var subtypeUUID = uuid.generate(this.id)

    // add service
    var accessory = this.configNode.accessory
    var service = accessory.addService(Service[this.serviceName], this.name, subtypeUUID)

    this.service = service
    var node = this

    // the pinCode should be shown to the user until interaction with
    // iOS client starts
    node.status({fill: 'yellow', shape: 'ring', text: node.configNode.pinCode})

    // emit message when value changes
    service.on('characteristic-change', function (info) {
      var msg = { payload: {}, hap: info}
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
      var updates = []
      if (msg.payload.hasOwnProperty('Updates')) {
        updates = msg.payload.Updates.slice(0)
        delete msg.payload.Updates
      }
      
      // iterate over characteristics to be written
      Object.keys(msg.payload).map(function (key, index) {
        if (supported.write.indexOf(key) < 0) {
          // characteristic is not supported
          node.warn('Characteristic ' + key + ' cannot be written.\nTry one of these: ' + supported.write.join(', '))
        } else {
          if (updates.indexOf(key) != -1) {
            service.updateCharacteristic(Characteristic[key], (msg.payload[key]))
          } else {
            service.setCharacteristic(Characteristic[key], (msg.payload[key]))
          }
        }
      })
    })

    this.on('close', function () {
      accessory.removeService(service)
    })
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
