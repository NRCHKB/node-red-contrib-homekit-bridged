import { SerializedAccessory } from 'hap-nodejs'

type SerializedHostType = {
    _isBridge: boolean
} & SerializedAccessory

export { SerializedHostType }
