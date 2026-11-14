import type HAPServiceConfigType from '../types/HAPServiceConfigType'
import type HAPServiceNodeType from '../types/HAPServiceNodeType'

import buildCharacteristicUtilsBase = require('./CharacteristicUtilsBase')
import buildServiceUtils = require('./ServiceUtils')

const buildCharacteristicUtils = (node: HAPServiceNodeType) => {
    return buildCharacteristicUtilsBase<
        HAPServiceConfigType,
        HAPServiceNodeType
    >(node, buildServiceUtils, { getHandlerUsesCharacteristics: false })
}

export = buildCharacteristicUtils
