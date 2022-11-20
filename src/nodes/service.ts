import { logger } from '@nrchkb/logger'
import { NodeAPI } from 'node-red'

const log = logger('NRCHKB', 'HAPServiceNode')

module.exports = (RED: NodeAPI) => {
    const HAPServiceNode = require('../lib/HAPServiceNode')(RED)

    log.debug('Registering homekit-service type')
    RED.nodes.registerType('homekit-service', HAPServiceNode.preInit)
}
