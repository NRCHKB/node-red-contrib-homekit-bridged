'use strict'
module.exports = function (RED) {
  var HapNodeJS = require('hap-nodejs')
  var UUID = HapNodeJS.uuid

  // Accessory API
  var _initAccessoryAPI = function () {
        // Retrieve Accessory Types
    RED.httpAdmin.get('/homekit/accessory/types', RED.auth.needsPermission('homekit.read'), function (req, res) {
      res.json(HapNodeJS.Accessory.Categories)
    })
  }

  // Service API
  var _initServiceAPI = function () {
      // Retrieve Service Types
    RED.httpAdmin.get('/homekit/service/types', RED.auth.needsPermission('homekit.read'), function (req, res) {
      var data = {}
      Object.keys(HapNodeJS.Service).forEach(function (key) {
        var val = HapNodeJS.Service[key]
        if (typeof val === 'function' && val.hasOwnProperty('UUID')) {
          data[key] = val.UUID
        }
      })
      res.json(data)
    })
  }

  var init = function () {
    _initAccessoryAPI()
    _initServiceAPI()
  }

  return {
    init: init,
    _: {
      initAccessoryAPI: _initAccessoryAPI,
      initServiceAPI: _initServiceAPI
    }
  }
}
