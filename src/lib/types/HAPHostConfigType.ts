import { MDNSAdvertiser } from 'hap-nodejs'
import { NodeDef } from 'node-red'
import { SemVer } from 'semver'

import HapCategories from './hap-nodejs/HapCategories'

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
    bind?: string
    bindType?: 'json' | 'str'
    /**
     * @deprecated use bind instead
     */
    customMdnsConfig: boolean
    /**
     * @deprecated use bind instead
     */
    mdnsMulticast: boolean
    /**
     * @deprecated use bind instead
     */
    mdnsInterface: string
    /**
     * @deprecated use bind instead
     */
    mdnsPort: number
    /**
     * @deprecated use bind instead
     */
    mdnsIp: string
    /**
     * @deprecated use bind instead
     */
    mdnsTtl: number
    /**
     * @deprecated use bind instead
     */
    mdnsLoopback: boolean
    /**
     * @deprecated use bind instead
     */
    mdnsReuseAddr: boolean
    allowMessagePassthrough: boolean
    accessoryCategory: HapCategories
    advertiser: MDNSAdvertiser
}

export default HAPHostConfigType
