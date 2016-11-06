'use strict'
module.exports = function (RED) {
  var HapNodeJS = require('hap-nodejs')
  var UUID = HapNodeJS.uuid

  var _initServiceAPI = function () {
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
    _initServiceAPI()
  }

  return {
    init: init,
    _: {
      initServiceAPI: _initServiceAPI
    }
  }
}
