import { NodeAPI } from 'node-red'

import { NodeStatusUtils } from '../utils/NodeStatusUtils'
import HAPServiceNodeType from './HAPServiceNodeType'
import HAPStatusConfigType from './HAPStatusConfigType'
import NodeType from './NodeType'

type HAPStatusNodeType = NodeType & {
    config: HAPStatusConfigType
    RED: NodeAPI
    serviceNode?: HAPServiceNodeType
    nodeStatusUtils: NodeStatusUtils
}

export default HAPStatusNodeType
