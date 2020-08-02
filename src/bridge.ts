import { Red } from 'node-red'

module.exports = (RED: Red) => {
    const debug = require('debug')('NRCHKB')
    const HAPBridgeNode = require('./lib/HAPBridgeNode')(RED)

    debug('Registering homekit-bridge type')
    RED.nodes.registerType('homekit-bridge', HAPBridgeNode.init)
}
