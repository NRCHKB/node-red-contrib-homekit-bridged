import type { CharacteristicProps } from '@homebridge/hap-nodejs'

type CustomCharacteristicType = CharacteristicProps & {
    UUID?: string
    name?: string
}

export default CustomCharacteristicType
