import { Node } from 'node-red'
import HAPBridgeConfigType from './HAPBridgeConfigType'
import { Bridge, Categories } from 'hap-nodejs'
import MdnsConfigType from './MdnsConfigType'

type HAPBridgeNodeType = Node & {
    config: HAPBridgeConfigType,
    pinCode: string,
    bridge: Bridge,
    port?: number,
    allowInsecureRequest: boolean,
    allowMessagePassthrough: boolean
    manufacturer: string,
    serialNo: string,
    model: string,
    firmwareRev: string,
    hardwareRev: string,
    softwareRev: string,
    mdnsConfig: MdnsConfigType,
    accessoryType: Categories,
    published: boolean,
    bridgeUsername: string,
    publish: () => void
}

export default HAPBridgeNodeType
