import { Node } from 'node-red'
import HAPHostConfigType from './HAPHostConfigType'
import { Accessory } from 'hap-nodejs'
import MdnsConfigType from './MdnsConfigType'
import HapCategories from './HapCategories'
import HostType from './HostType'

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
