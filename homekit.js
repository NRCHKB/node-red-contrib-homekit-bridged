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

  function HAPServiceNode (n) {
    RED.nodes.createNode(this, n)
    var node = this

// accessory id, name and service type stick to node instance
    node.accessoryUUID = uuid.generate(node.id)
    node.accessoryName = n.name || node.id
    node.serviceType = n.servicetype

    // transform the node id (e.g. fc03c1f9.60d73) into something like a
    // MAC-Address (00:0f:c0:3c:1f:96:0d:73)
    var macAddress = macify(node.id)

    // the pinCode should be shown to the user until interaction with
    // iOS client starts
    // TODO randomize pinCode
    var pinCode = '111-11-111'
    node.status({fill: 'yellow', shape: 'ring', text: pinCode})

    // create single-service-accessory
    // TODO introduce config node for accessory
    var accessory = new Accessory(node.accessoryName, node.accessoryUUID)
    var service = Service[node.serviceType]
    accessory.addService(service, node.accessoryName)

    // publish accessory to become reality
    accessory.publish({
      username: macAddress,
      pincode: pinCode
    }, true)

    // visualize the "identify" event
    accessory.on('identify', function (paired, callback) {
      node.status({fill: 'yellow', shape: 'dot', text: 'identify'})
      setTimeout(function () { node.status({}) }, 3000)
      callback() // success
    })

    // emit message when value changes
    accessory.on('service-characteristic-change', function (info) {
      var msg = { payload: {}, hap: info}
      var key = info.characteristic.displayName.replace(/ /g, '')
      msg.payload[key] = info.newValue
      node.status({fill: 'yellow', shape: 'dot', text: key + ': ' + info.newValue})
      setTimeout(function () { node.status({}) }, 3000)
      node.send(msg)
    })

    // which characteristics are supported?
    var supported = { read: [], write: []}
    var srv = accessory.getService(service)
    var allCharacteristics = srv.characteristics.concat(srv.optionalCharacteristics)
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
        // payload must be an object
      if (!(msg.payload instanceof Object)) {
        node.warn('Invalid property.\nTry one of these: ' + supported.write.join(', '))
        return
      }

      // iterate over characteristics to be written
      Object.keys(msg.payload).map(function (key, index) {
        if (supported.write.indexOf(key) < 0) {
            // characteristic is not supported
          node.warn('Characteristic ' + key + ' cannot be written.\nTry one of these: ' + supported.write.join(', '))
        } else {
          srv
            .setCharacteristic(Characteristic[key], (msg.payload[key]))
        }
      })
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
