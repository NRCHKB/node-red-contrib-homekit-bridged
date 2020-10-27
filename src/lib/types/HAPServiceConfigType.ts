import { NodeDef } from 'node-red'
import CameraConfigType from './CameraConfigType'

type HAPServiceConfigType = NodeDef & {
    isParent: boolean,
    bridge: string,
    parentService: string,
    name: string,
    serviceName: string,
    topic: string,
    filter: boolean,
    manufacturer: string,
    model: string,
    serialNo: string,
    firmwareRev?: string,
    hardwareRev?: string,
    softwareRev?: string,
    characteristicProperties: string,
    waitForSetupMsg: boolean
} & CameraConfigType

export default HAPServiceConfigType
