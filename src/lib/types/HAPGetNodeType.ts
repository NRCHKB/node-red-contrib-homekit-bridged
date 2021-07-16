import NodeType from './NodeType'
import { NodeAPI } from 'node-red'
import StatusUtilType from './StatusUtilType'
import HAPServiceNodeType from './HAPServiceNodeType'
import HAPGetConfigType from './HAPGetConfigType'

type HAPGetNodeType = NodeType & {
    config: HAPGetConfigType
    RED: NodeAPI
    serviceNode?: HAPServiceNodeType
} & StatusUtilType

export default HAPGetNodeType
