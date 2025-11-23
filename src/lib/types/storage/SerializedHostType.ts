import type { SerializedAccessory } from '@homebridge/hap-nodejs'

type SerializedHostType = {
  _isBridge: boolean
} & SerializedAccessory

export type { SerializedHostType }
