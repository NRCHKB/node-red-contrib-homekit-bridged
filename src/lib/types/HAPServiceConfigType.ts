import { NodeDef } from 'node-red'
import CameraConfigType from './CameraConfigType'
import HostType from './HostType'

type HAPServiceConfigType = NodeDef & {
    isParent: boolean
    hostType: HostType
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
} & CameraConfigType

export default HAPServiceConfigType
