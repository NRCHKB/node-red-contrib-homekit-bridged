import { Node } from 'node-red'
import { FlowType } from './FlowType'

type NodeType = Node & {
    _flow: FlowType
    _alias: string
}

export default NodeType
