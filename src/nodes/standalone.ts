import { logger } from '@nrchkb/logger'
import { NodeAPI } from 'node-red'

import HostType from '../lib/types/HostType'

const log = logger('NRCHKB', 'HAPHostNode')

module.exports = (RED: NodeAPI) => {
    const HAPHostNode = require('../lib/HAPHostNode')(RED, HostType.STANDALONE)

    log.debug('Registering homekit-standalone type')
    RED.nodes.registerType('homekit-standalone', HAPHostNode.init)
}
