import type { NodeAPI } from 'node-red'

import type { NodeStatusUtils } from '../utils/NodeStatusUtils'
import type HAPServiceNodeType from './HAPServiceNodeType'
import type HAPStatusConfigType from './HAPStatusConfigType'
import type NodeType from './NodeType'

type HAPStatusNodeType = NodeType & {
    config: HAPStatusConfigType
    RED: NodeAPI
    serviceNode?: HAPServiceNodeType
    nodeStatusUtils: NodeStatusUtils
}

export default HAPStatusNodeType
