import { NodeAPI } from 'node-red'

import HAPServiceNodeType from './HAPServiceNodeType'
import HAPStatusConfigType from './HAPStatusConfigType'
import NodeType from './NodeType'
import StatusUtilType from './StatusUtilType'

type HAPStatusNodeType = NodeType & {
    config: HAPStatusConfigType
    RED: NodeAPI
    serviceNode?: HAPServiceNodeType
} & StatusUtilType

export default HAPStatusNodeType
