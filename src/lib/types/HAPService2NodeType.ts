import NodeType from './NodeType'
import { NodeAPI } from 'node-red'
import HAPService2ConfigType from './HAPService2ConfigType'
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
import HAPServiceNodeType from './HAPServiceNodeType'
import { HAPConnection } from 'hap-nodejs/dist/lib/util/eventedhttp'

type HAPService2NodeType = NodeType & {
    config: HAPService2ConfigType
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
} & StatusUtilType

export default HAPService2NodeType
