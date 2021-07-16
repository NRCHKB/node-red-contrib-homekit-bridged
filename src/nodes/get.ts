import { NodeAPI } from 'node-red'
import { logger } from '@nrchkb/logger'
import HAPGetNodeType from '../lib/types/HAPGetNodeType'
import HAPGetConfigType from '../lib/types/HAPGetConfigType'
import HAPServiceNodeType from '../lib/types/HAPServiceNodeType'
import { Service } from 'hap-nodejs'

const log = logger('NRCHKB', 'HAPGetNode')

module.exports = (RED: NodeAPI) => {
    log.debug('Registering homekit-get type')
    RED.nodes.registerType(
        'homekit-get',
        function (this: HAPGetNodeType, config: HAPGetConfigType) {
            const self = this
            self.config = config
            RED.nodes.createNode(self, config)

            self.lastStatusId = 0
            self.setStatus = (status, timeout) => {
                self.status(status)
                self.lastStatusId = new Date().getTime()

                if (timeout) {
                    self.clearStatus(self.lastStatusId, timeout)
                }

                return self.lastStatusId
            }
            self.clearStatus = (statusId, delay) => {
                if (statusId === self.lastStatusId) {
                    if (delay) {
                        setTimeout(function () {
                            self.setStatus({})
                        }, delay)
                    } else {
                        self.setStatus({})
                    }
                }
            }

            try {
                self.serviceNode = RED.nodes.getNode(
                    self.config.serviceNodeId
                ) as HAPServiceNodeType
            } catch (error) {
                log.error(error)
            }

            self.on('input', (_: Record<string, any>) => {
                if (self.serviceNode) {
                    self.setStatus(
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
                    self.setStatus(
                        {
                            fill: 'red',
                            shape: 'dot',
                            text: 'Check your config',
                        },
                        3000
                    )
                }
            })

            self.on('close', (_: boolean, done: () => void) => {
                self.serviceNode = undefined
                done()
            })
        }
    )
}
