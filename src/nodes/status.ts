import { Service } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type { NodeAPI } from 'node-red'

import type HAPServiceNodeType from '../lib/types/HAPServiceNodeType'
import type HAPStatusConfigType from '../lib/types/HAPStatusConfigType'
import type HAPStatusNodeType from '../lib/types/HAPStatusNodeType'
import { NodeStatusUtils } from '../lib/utils/NodeStatusUtils'

const log = logger('NRCHKB', 'HAPStatusNode')

module.exports = (RED: NodeAPI) => {
  log.debug('Registering homekit-status type')
  RED.nodes.registerType(
    'homekit-status',
    function (this: HAPStatusNodeType, config: HAPStatusConfigType) {
      this.config = config
      RED.nodes.createNode(this, config)

      this.nodeStatusUtils = new NodeStatusUtils(this)

      try {
        this.serviceNode = RED.nodes.getNode(
          this.config.serviceNodeId
        ) as HAPServiceNodeType
      } catch (error: any) {
        log.error(error)
      }

      this.on('input', (_: Record<string, any>) => {
        if (this.serviceNode) {
          this.nodeStatusUtils.setStatus(
            {
              fill: 'green',
              shape: 'dot',
              text: 'Done'
            },
            3000
          )
          const serializedService = Service.serialize(this.serviceNode.service)
          this.send({
            payload: serializedService
          })
        } else {
          this.nodeStatusUtils.setStatus({
            fill: 'red',
            shape: 'dot',
            text: 'Check your config'
          })
        }
      })

      this.on('close', (_: boolean, done: () => void) => {
        this.serviceNode = undefined
        done()
      })
    }
  )
}
