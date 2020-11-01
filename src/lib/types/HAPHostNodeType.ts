import { Node } from 'node-red'
import HAPHostConfigType from './HAPHostConfigType'
import { Accessory } from 'hap-nodejs'
import MdnsConfigType from './MdnsConfigType'
import HostType from './HostType'
import HapCategories from './HapCategories'

type HAPHostNodeType = Node & {
    config: HAPHostConfigType
    mdnsConfig: MdnsConfigType
    accessoryType: HapCategories
    published: boolean
    bridgeUsername: string
    publish: () => boolean
    hostType: HostType
    host: Accessory
}

export default HAPHostNodeType
