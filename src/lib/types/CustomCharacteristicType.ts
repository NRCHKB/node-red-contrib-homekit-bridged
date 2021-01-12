import { CharacteristicProps } from 'hap-nodejs'

type CustomCharacteristicType = CharacteristicProps & {
    UUID?: string
    name?: string
}

export default CustomCharacteristicType
