import { Node } from 'node-red'
import HAPServiceConfigType from './HAPServiceConfigType'

type HAPServiceNodeType = Node & {
    config: HAPServiceConfigType
}

export default HAPServiceNodeType