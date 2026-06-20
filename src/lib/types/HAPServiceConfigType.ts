import type { NodeDef } from 'node-red'
import type { AdaptiveLightingControllerMode } from '../hap/hap-nodejs'
import type { NRCHKBLogLevel } from '../utils/LogUtils'

import type CameraConfigType from './CameraConfigType'

type HAPServiceConfigType = NodeDef & {
    isParent: boolean
    // hostType is number but browser js is passing it as string which may cause same comparison issues
    // values are BRIDGE = 0, STANDALONE = 1
    hostType: number
    bridge: string
    accessoryId: string
    parentService: string
    name: string
    serviceName: string
    topic: string
    filter: boolean
    logLevel?: NRCHKBLogLevel
    manufacturer: string
    model: string
    serialNo: string
    firmwareRev?: string
    hardwareRev?: string
    softwareRev?: string
    characteristicProperties: string
    waitForSetupMsg: boolean
    // If Service is a LightBulb, you can set AdaptiveLightingControllerMode.ts Lightning Mode
    adaptiveLightingOptionsEnable?: boolean
    adaptiveLightingOptionsMode?: AdaptiveLightingControllerMode
    adaptiveLightingOptionsCustomTemperatureAdjustment?: number
} & CameraConfigType

export default HAPServiceConfigType
