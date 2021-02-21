import { Node } from 'node-red'
import HAPHostConfigType from './HAPHostConfigType'
import { Accessory, Categories } from 'hap-nodejs'
import HostType from './HostType'
import { MulticastOptions } from 'bonjour-hap'

type HAPHostNodeType = Node & {
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
