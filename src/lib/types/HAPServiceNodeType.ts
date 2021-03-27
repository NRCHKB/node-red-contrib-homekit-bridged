import { Node, NodeAPI } from 'node-red'
import HAPServiceConfigType from './HAPServiceConfigType'
import { Accessory, CharacteristicProps, Service } from 'hap-nodejs'
import HAPHostNodeType from './HAPHostNodeType'
import PublishTimersType from './PublishTimersType'

type HAPServiceNodeType = Node & {
    config: HAPServiceConfigType
    RED: NodeAPI
    setupDone: boolean
    configured: boolean
    handleWaitForSetup: (msg: any) => any
    onIdentify: (paired: boolean, callback: () => any) => void
    hostNode: HAPHostNodeType
    childNodes: HAPServiceNodeType[]
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
}

export default HAPServiceNodeType
