import NodeType from './NodeType'
import { NodeAPI } from 'node-red'
import StatusUtilType from './StatusUtilType'
import HAPServiceNodeType from './HAPServiceNodeType'
import HAPStatusConfigType from './HAPStatusConfigType'

type HAPStatusNodeType = NodeType & {
    config: HAPStatusConfigType
    RED: NodeAPI
    serviceNode?: HAPServiceNodeType
} & StatusUtilType

export default HAPStatusNodeType
