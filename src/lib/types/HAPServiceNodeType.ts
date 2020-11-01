import { Node, NodeAPI } from 'node-red'
import HAPServiceConfigType from './HAPServiceConfigType'
import { Accessory, Service } from 'hap-nodejs'
import HAPHostNodeType from './HAPHostNodeType'
import PublishTimersType from './PublishTimersType'

type HAPServiceNodeType = Node & {
    config: HAPServiceConfigType
    RED: NodeAPI
    setupDone: boolean
    handleWaitForSetup: (msg: any) => any
    onIdentify: (paired: boolean, callback: () => any) => void
    hostNode: HAPHostNodeType
    childNodes: HAPServiceNodeType[]
    service: Service
    parentService: Service
    accessory: Accessory
    characteristicProperties: Record<string, unknown>
    supported: []
    publishTimers: PublishTimersType
}

export default HAPServiceNodeType
