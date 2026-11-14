import { logger } from '@nrchkb/logger'
import type { NodeAPI, NodeConstructor } from 'node-red'
import type UniFiControllerConfigType from '../lib/types/UniFiControllerConfigType'
import type {
    UniFiControllerCredentials,
    UniFiControllerNodeType,
} from '../lib/types/UniFiControllerConfigType'

const log = logger('NRCHKB', 'UniFiController')

module.exports = (RED: NodeAPI) => {
    const init: NodeConstructor<
        UniFiControllerNodeType,
        UniFiControllerConfigType,
        UniFiControllerCredentials
    > = function (config) {
        RED.nodes.createNode(this, config)
        this.name = config.name
        this.address = config.address
        this.application = config.application ?? 'protect'
        this.allowSelfSigned = config.allowSelfSigned === true
        this.overrideAddress = config.overrideAddress
    }

    log.debug('Registering homekit-unifi-controller type')
    RED.nodes.registerType<
        UniFiControllerNodeType,
        UniFiControllerConfigType,
        Record<never, never>,
        UniFiControllerCredentials
    >('homekit-unifi-controller', init, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    })
}
