import type { MDNSAdvertiser } from '@homebridge/hap-nodejs'
import type { NodeDef } from 'node-red'
import type { SemVer } from 'semver'

import type HapCategories from './hap-nodejs/HapCategories'

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
  allowMessagePassthrough: boolean
  accessoryCategory: HapCategories
  advertiser: MDNSAdvertiser
}

export default HAPHostConfigType
