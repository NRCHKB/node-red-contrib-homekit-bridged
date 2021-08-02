import NodeType from './NodeType'
import { NodeAPI } from 'node-red'
import { Accessory, CharacteristicProps, Service } from 'hap-nodejs'
import HAPHostNodeType from './HAPHostNodeType'
import PublishTimersType from './PublishTimersType'
import StatusUtilType from './StatusUtilType'
import HAPServiceConfigType from './HAPServiceConfigType'
import HAPService2NodeType from './HAPService2NodeType'

type HAPServiceNodeType = NodeType & {
    config: HAPServiceConfigType
    RED: NodeAPI
    setupDone: boolean
    configured: boolean
    handleWaitForSetup: (msg: any) => any
    onIdentify: (paired: boolean, callback: () => any) => void
    hostNode: HAPHostNodeType
    childNodes: (HAPService2NodeType | HAPServiceNodeType)[]
    service: Service
    parentService: Service
    accessory: Accessory
    characteristicProperties: { [key: string]: CharacteristicProps }
    supported: string[]
    publishTimers: PublishTimersType
    topic_in: string
    onCharacteristicGet: any
    onCharacteristicSet: any
    onCharacteristicChange: any
    uniqueIdentifier: string
} & StatusUtilType

export default HAPServiceNodeType
