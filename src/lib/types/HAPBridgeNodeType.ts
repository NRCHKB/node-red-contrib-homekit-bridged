import { Node } from 'node-red'
import HAPBridgeConfigType from './HAPBridgeConfigType'

type HAPBridgeNodeType = Node & {
    config: HAPBridgeConfigType
}

export default HAPBridgeNodeType