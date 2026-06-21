import type { NodeDef } from 'node-red'
import type { NRCHKBLogLevel } from '../utils/LogUtils'

export type UniFiApplicationType = 'protect'

type UniFiControllerConfigType = NodeDef & {
    name?: string
    address?: string
    application?: UniFiApplicationType
    allowSelfSigned?: boolean
    overrideAddress?: string
    logLevel?: NRCHKBLogLevel
}

export type UniFiControllerCredentials = {
    username?: string
    password?: string
}

export default UniFiControllerConfigType
