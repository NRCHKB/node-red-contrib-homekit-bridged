import NodeType from './NodeType'
import HAPHostConfigType from './HAPHostConfigType'
import { Accessory, Categories } from 'hap-nodejs'
import HostType from './HostType'
import { MulticastOptions } from 'bonjour-hap'

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
