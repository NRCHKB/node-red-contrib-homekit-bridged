import { NodeAPI } from 'node-red'
import { logger } from '@nrchkb/logger'
import HAPStatusNodeType from '../lib/types/HAPStatusNodeType'
import HAPStatusConfigType from '../lib/types/HAPStatusConfigType'
import HAPServiceNodeType from '../lib/types/HAPServiceNodeType'
import { Service } from 'hap-nodejs'

const log = logger('NRCHKB', 'HAPStatusNode')

module.exports = (RED: NodeAPI) => {
    log.debug('Registering homekit-status type')
    RED.nodes.registerType(
        'homekit-status',
        function (this: HAPStatusNodeType, config: HAPStatusConfigType) {
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
