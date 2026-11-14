import type { NodeDef } from 'node-red'

import type HAPServiceConfigType from './HAPServiceConfigType'

type HAPService2ConfigType = NodeDef &
    HAPServiceConfigType & {
        outputMode?: 'events' | 'legacy'
        useEventCallback: boolean
        plugins?: string | Array<Record<string, unknown>>
        plugin1?: string
        plugin2?: string
        plugin3?: string
        plugin4?: string
        plugin5?: string
        plugin6?: string
        plugin7?: string
        plugin8?: string
        pluginSetupComplete?: boolean
    }

export default HAPService2ConfigType
