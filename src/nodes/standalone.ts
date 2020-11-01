import { NodeAPI } from 'node-red'
import HostType from '../lib/types/HostType'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('NRCHKB')
    const HAPHostNode = require('../lib/HAPHostNode')(RED, HostType.STANDALONE)

    debug('Registering homekit-standalone type')
    RED.nodes.registerType('homekit-standalone', HAPHostNode.init)
}
