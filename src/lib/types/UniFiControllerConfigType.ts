import type { NodeDef } from 'node-red'

export type UniFiApplicationType = 'protect'

type UniFiControllerConfigType = NodeDef & {
    name?: string
    address?: string
    application?: UniFiApplicationType
    allowSelfSigned?: boolean
    overrideAddress?: string
}

export type UniFiControllerCredentials = {
    username?: string
    password?: string
}

export default UniFiControllerConfigType
