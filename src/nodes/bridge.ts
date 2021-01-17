import { NodeAPI } from 'node-red'
import HostType from '../lib/types/HostType'
import { logger } from '../lib/logger'

const [logDebug] = logger('HAPHostNode')

module.exports = (RED: NodeAPI) => {
    const HAPHostNode = require('../lib/HAPHostNode')(RED, HostType.BRIDGE)

    logDebug('Registering homekit-bridge type')
    RED.nodes.registerType('homekit-bridge', HAPHostNode.init)
}
