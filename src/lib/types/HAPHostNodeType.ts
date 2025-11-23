import { Accessory, Categories } from '@homebridge/hap-nodejs'

import HAPHostConfigType from './HAPHostConfigType'
import HostType from './HostType'
import NodeType from './NodeType'

type HAPHostNodeType = NodeType & {
  config: HAPHostConfigType
  accessoryCategory: Categories
  published: boolean
  bridgeUsername: string
  publish: () => boolean
  hostType: HostType
  host: Accessory
}

export default HAPHostNodeType
