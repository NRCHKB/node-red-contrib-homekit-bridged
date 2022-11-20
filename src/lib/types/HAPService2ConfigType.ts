import { NodeDef } from 'node-red'

import CameraConfigType from './CameraConfigType'

type HAPService2ConfigType = NodeDef & {
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
    manufacturer: string
    model: string
    serialNo: string
    firmwareRev?: string
    hardwareRev?: string
    softwareRev?: string
    characteristicProperties: string
    waitForSetupMsg: boolean
    useEventCallback: boolean
} & CameraConfigType

export default HAPService2ConfigType
