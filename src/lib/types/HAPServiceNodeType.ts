import { Node, NodeAPI } from 'node-red'
import HAPServiceConfigType from './HAPServiceConfigType'
import { Accessory, Service } from 'hap-nodejs'
import HAPBridgeNodeType from './HAPBridgeNodeType'

type HAPServiceNodeType = Node & {
    config: HAPServiceConfigType,
    RED: NodeAPI,
    setupDone: boolean,
    handleWaitForSetup: (msg: any) => any,
    onIdentify: (paired: boolean, callback: () => any) => void,
    isParentNode: boolean,
    bridgeNode: HAPBridgeNodeType,
    topic: string,
    filter: boolean,
    serviceName: string,
    manufacturer: string,
    serialNo: string,
    model: string,
    firmwareRev?: string,
    hardwareRev?: string,
    softwareRev?: string,
    childNodes: HAPServiceNodeType[],
    service: Service,
    parentService: Service,
    accessory: Accessory,
    characteristicProperties: {},
    supported: []
}

export default HAPServiceNodeType
