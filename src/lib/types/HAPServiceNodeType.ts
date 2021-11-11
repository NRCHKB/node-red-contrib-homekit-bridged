import NodeType from './NodeType'
import { NodeAPI } from 'node-red'
import {
    Accessory,
    Characteristic,
    CharacteristicChange,
    CharacteristicGetCallback,
    CharacteristicProps,
    CharacteristicSetCallback,
    CharacteristicValue,
    Service,
} from 'hap-nodejs'
import HAPHostNodeType from './HAPHostNodeType'
import PublishTimersType from './PublishTimersType'
import StatusUtilType from './StatusUtilType'
import HAPServiceConfigType from './HAPServiceConfigType'
import HAPService2NodeType from './HAPService2NodeType'
import { HAPConnection } from 'hap-nodejs/dist/lib/util/eventedhttp'

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
    parentNode?: HAPService2NodeType | HAPServiceNodeType
    accessory: Accessory
    characteristicProperties: { [key: string]: CharacteristicProps }
    supported: string[]
    publishTimers: PublishTimersType
    topic_in: string
    onCharacteristicGet: (
        this: Characteristic,
        callback: CharacteristicGetCallback,
        context: any,
        connection?: HAPConnection
    ) => void
    onCharacteristicSet: (
        this: Characteristic,
        newValue: CharacteristicValue,
        callback: CharacteristicSetCallback,
        context: any,
        connection?: HAPConnection
    ) => void
    onCharacteristicChange: (
        this: Characteristic,
        change: CharacteristicChange
    ) => void
    uniqueIdentifier: string
    // Is Accessory reachable? On Linked Service it will be undefined. If is not true then NO_RESPONSE
    reachable?: boolean
} & StatusUtilType

export default HAPServiceNodeType
