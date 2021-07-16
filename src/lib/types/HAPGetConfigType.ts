import { NodeDef } from 'node-red'

type HAPGetConfigType = NodeDef & {
    serviceNodeId: string
}

export default HAPGetConfigType
