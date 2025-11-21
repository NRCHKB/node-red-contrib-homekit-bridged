import { SerializedAccessory } from '@homebridge/hap-nodejs'

type SerializedHostType = {
    _isBridge: boolean
} & SerializedAccessory

export { SerializedHostType }
