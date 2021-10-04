import { NodeDef } from 'node-red'

type HAPStatusConfigType = NodeDef & {
    serviceNodeId: string
}

export default HAPStatusConfigType
