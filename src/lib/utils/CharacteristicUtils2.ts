import type HAPService2ConfigType from '../types/HAPService2ConfigType'
import type HAPService2NodeType from '../types/HAPService2NodeType'

import buildCharacteristicUtilsBase = require('./CharacteristicUtilsBase')
import buildServiceUtils2 = require('./ServiceUtils2')

const buildCharacteristicUtils2 = (node: HAPService2NodeType) => {
    return buildCharacteristicUtilsBase<
        HAPService2ConfigType,
        HAPService2NodeType
    >(node, buildServiceUtils2, { getHandlerUsesCharacteristics: true })
}

export = buildCharacteristicUtils2
