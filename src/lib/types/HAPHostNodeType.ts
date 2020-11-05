import { Node } from 'node-red'
import HAPHostConfigType from './HAPHostConfigType'
import { Accessory, Categories } from 'hap-nodejs'
import MdnsConfigType from './MdnsConfigType'
import HostType from './HostType'

type HAPHostNodeType = Node & {
    config: HAPHostConfigType
    mdnsConfig: MdnsConfigType
    accessoryCategory: Categories
    published: boolean
    bridgeUsername: string
    publish: () => boolean
    hostType: HostType
    host: Accessory
}

export default HAPHostNodeType
