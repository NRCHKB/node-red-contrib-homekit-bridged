import { logger } from '@nrchkb/logger'
import { Service } from 'hap-nodejs'
import { NodeAPI } from 'node-red'

import HAPServiceNodeType from '../lib/types/HAPServiceNodeType'
import HAPStatusConfigType from '../lib/types/HAPStatusConfigType'
import HAPStatusNodeType from '../lib/types/HAPStatusNodeType'
import { NodeStatusUtils } from '../lib/utils/NodeStatusUtils'

const log = logger('NRCHKB', 'HAPStatusNode')

module.exports = (RED: NodeAPI) => {
    log.debug('Registering homekit-status type')
    RED.nodes.registerType(
        'homekit-status',
        function (this: HAPStatusNodeType, config: HAPStatusConfigType) {
            const self = this
            self.config = config
            RED.nodes.createNode(self, config)

            self.nodeStatusUtils = new NodeStatusUtils(self)

            try {
                self.serviceNode = RED.nodes.getNode(
                    self.config.serviceNodeId
                ) as HAPServiceNodeType
            } catch (error: any) {
                log.error(error)
            }

            self.on('input', (_: Record<string, any>) => {
                if (self.serviceNode) {
                    self.nodeStatusUtils.setStatus(
                        {
                            fill: 'green',
                            shape: 'dot',
                            text: 'Done',
                        },
                        3000
                    )
                    const serializedService = Service.serialize(
                        self.serviceNode.service
                    )
                    self.send({
                        payload: serializedService,
                    })
                } else {
                    self.nodeStatusUtils.setStatus({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Check your config',
                    })
                }
            })

            self.on('close', (_: boolean, done: () => void) => {
                self.serviceNode = undefined
                done()
            })
        }
    )
}
