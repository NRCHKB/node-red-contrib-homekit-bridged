import { MDNSAdvertiser } from 'hap-nodejs'
import { NodeDef } from 'node-red'
import { SemVer } from 'semver'

import HapCategories from './HapCategories'

type HAPHostConfigType = NodeDef & {
    bridgeName: string
    pinCode: string
    port?: number
    allowInsecureRequest: boolean
    manufacturer: string
    model: string
    serialNo: string
    firmwareRev: SemVer
    hardwareRev: SemVer
    softwareRev: SemVer
    customMdnsConfig: boolean
    mdnsMulticast: boolean
    mdnsInterface: string
    mdnsPort: number
    mdnsIp: string
    mdnsTtl: number
    mdnsLoopback: boolean
    mdnsReuseAddr: boolean
    allowMessagePassthrough: boolean
    accessoryCategory: HapCategories
    advertiser: MDNSAdvertiser
}

export default HAPHostConfigType
