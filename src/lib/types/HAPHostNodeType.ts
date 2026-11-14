import type {
    Accessory,
    AdaptiveLightingController,
    Categories,
} from '@homebridge/hap-nodejs'

import type HAPHostConfigType from './HAPHostConfigType'
import type HostType from './HostType'
import type NodeType from './NodeType'

type HAPHostNodeType = NodeType & {
    config: HAPHostConfigType
    accessoryCategory: Categories
    published: boolean
    bridgeUsername: string
    paired: boolean
    publish: () => boolean
    hostType: HostType
    host: Accessory
    // Adaptive Lighting controllers of this host, by service node id
    adaptiveLightingControllers: Map<string, AdaptiveLightingController>
}

export default HAPHostNodeType
