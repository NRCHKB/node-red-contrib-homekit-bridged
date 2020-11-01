import { NodeAPI } from 'node-red'
import HostType from '../lib/types/HostType'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('NRCHKB')
    const HAPHostNode = require('../lib/HAPHostNode')(RED, HostType.BRIDGE)

    debug('Registering homekit-bridge type')
    RED.nodes.registerType('homekit-bridge', HAPHostNode.init)
}
