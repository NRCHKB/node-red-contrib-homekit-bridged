import type { NodeDef } from 'node-red'
import type { NRCHKBLogLevel } from '../utils/LogUtils'

type HAPStatusConfigType = NodeDef & {
    serviceNodeId: string
    logLevel?: NRCHKBLogLevel
}

export default HAPStatusConfigType
