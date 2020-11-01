module.exports = function (node) {
    const ServiceUtils = require('./ServiceUtils')(node)
    const BridgeUtils = require('./BridgeUtils')()
    const AccessoryUtils = require('./AccessoryUtils')(node)
    const CharacteristicUtils = require('./CharacteristicUtils')(node)
    const MdnsUtils = require('./MdnsUtils')()

    return {
        ServiceUtils: ServiceUtils,
        BridgeUtils: BridgeUtils,
        AccessoryUtils: AccessoryUtils,
        CharacteristicUtils: CharacteristicUtils,
        MdnsUtils: MdnsUtils,
    }
}
