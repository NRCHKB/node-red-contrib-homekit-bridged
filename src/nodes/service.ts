import { NodeAPI } from 'node-red'
import { logger } from '@nrchkb/logger'

const log = logger('HAPServiceNode')

module.exports = (RED: NodeAPI) => {
    const HAPServiceNode = require('../lib/HAPServiceNode')(RED)

    log.debug('Registering homekit-service type')
    RED.nodes.registerType('homekit-service', HAPServiceNode.preInit)
}
