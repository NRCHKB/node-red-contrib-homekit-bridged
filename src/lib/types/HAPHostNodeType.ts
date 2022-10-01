import { MulticastOptions } from 'bonjour-hap'
import { Accessory, Categories } from 'hap-nodejs'

import HAPHostConfigType from './HAPHostConfigType'
import HostType from './HostType'
import NodeType from './NodeType'

type HAPHostNodeType = NodeType & {
    config: HAPHostConfigType
    mdnsConfig: MulticastOptions
    accessoryCategory: Categories
    published: boolean
    bridgeUsername: string
    publish: () => boolean
    hostType: HostType
    host: Accessory
}

export default HAPHostNodeType
