import { Red } from 'node-red'

module.exports = (RED: Red) => {
    const debug = require('debug')('NRCHKB')
    const HAPServiceNode = require('./lib/HAPServiceNode')(RED)

    debug('Registering homekit-service type')
    RED.nodes.registerType('homekit-service', HAPServiceNode.init)
}
