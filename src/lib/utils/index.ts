import type HAPServiceNodeType from '../types/HAPServiceNodeType'

module.exports = (node: HAPServiceNodeType) => {
  const ServiceUtils = require('./ServiceUtils')(node)
  const BridgeUtils = require('./BridgeUtils')()
  const AccessoryUtils = require('./AccessoryUtils')(node)
  const CharacteristicUtils = require('./CharacteristicUtils')(node)

  return {
    ServiceUtils,
    BridgeUtils,
    AccessoryUtils,
    CharacteristicUtils
  }
}
