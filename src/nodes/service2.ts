import { logger } from '@nrchkb/logger'
import { NodeAPI } from 'node-red'

const log = logger('NRCHKB', 'HAPServiceNode2')

module.exports = (RED: NodeAPI) => {
    const HAPServiceNode2 = require('../lib/HAPServiceNode2')(RED)

    if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
        log.debug('Registering homekit-service2 type')
        RED.nodes.registerType('homekit-service2', HAPServiceNode2.preInit)
    }
}
