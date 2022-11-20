import { logger } from '@nrchkb/logger'
import { NodeAPI } from 'node-red'

import HostType from '../lib/types/HostType'

const log = logger('NRCHKB', 'HAPHostNode')

module.exports = (RED: NodeAPI) => {
    const HAPHostNode = require('../lib/HAPHostNode')(RED, HostType.BRIDGE)

    log.debug('Registering homekit-bridge type')
    RED.nodes.registerType('homekit-bridge', HAPHostNode.init)
}
