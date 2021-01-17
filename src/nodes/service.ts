import { NodeAPI } from 'node-red'
import { logger } from '../lib/logger'

const [logDebug] = logger('HAPServiceNode')

module.exports = (RED: NodeAPI) => {
    const HAPServiceNode = require('../lib/HAPServiceNode')(RED)

    logDebug('Registering homekit-service type')
    RED.nodes.registerType('homekit-service', HAPServiceNode.preInit)
}
