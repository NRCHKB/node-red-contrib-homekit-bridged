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
import { HAPConnection } from 'hap-nodejs/dist/lib/util/eventedhttp'
import { NodeAPI } from 'node-red'

import HAPHostNodeType from './HAPHostNodeType'
import HAPService2ConfigType from './HAPService2ConfigType'
import HAPServiceNodeType from './HAPServiceNodeType'
import NodeType from './NodeType'
import PublishTimersType from './PublishTimersType'
import StatusUtilType from './StatusUtilType'

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

export default HAPService2NodeType
