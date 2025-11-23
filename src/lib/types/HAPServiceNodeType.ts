import type {
  Accessory,
  AdaptiveLightingController,
  Characteristic,
  CharacteristicChange,
  CharacteristicGetCallback,
  CharacteristicProps,
  CharacteristicSetCallback,
  CharacteristicValue,
  Service
} from '@homebridge/hap-nodejs'
import type { CharacteristicContext } from '@homebridge/hap-nodejs/dist/lib/Characteristic'
import type { HAPConnection } from '@homebridge/hap-nodejs/dist/lib/util/eventedhttp'
import type { NodeAPI } from 'node-red'

import type { NodeStatusUtils } from '../utils/NodeStatusUtils'
import type HAPHostNodeType from './HAPHostNodeType'
import type HAPService2NodeType from './HAPService2NodeType'
import type HAPServiceConfigType from './HAPServiceConfigType'
import type NodeType from './NodeType'
import type PublishTimersType from './PublishTimersType'

type HAPServiceNodeType = NodeType & {
  config: HAPServiceConfigType
  RED: NodeAPI
  setupDone: boolean
  configured: boolean
  handleWaitForSetup: (msg: any) => any
  onIdentify: (paired: boolean, callback: () => any) => void
  hostNode: HAPHostNodeType
  childNodes?: (HAPService2NodeType | HAPServiceNodeType)[]
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
    context: CharacteristicContext,
    connection?: HAPConnection
  ) => void
  onCharacteristicSet: (
    this: Characteristic,
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
    context: CharacteristicContext,
    connection?: HAPConnection
  ) => void
  onCharacteristicChange: (
    this: Characteristic,
    change: CharacteristicChange
  ) => void
  uniqueIdentifier: string
  // Is Accessory reachable? On Linked Service it will be undefined. If is not true then NO_RESPONSE
  reachable?: boolean
  nodeStatusUtils: NodeStatusUtils
  adaptiveLightingController?: AdaptiveLightingController
}

export default HAPServiceNodeType
