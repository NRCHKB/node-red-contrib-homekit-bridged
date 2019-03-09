module.exports = function (node) {
    const ServiceUtils = require("./ServiceUtils.js")(node);
    const BridgeUtils = require("./BridgeUtils.js")(node);
    const AccessoryUtils = require("./AccessoryUtils.js")(node);
    const CharacteristicUtils = require("./CharacteristicUtils.js")(node);
    const MdnsUtils = require("./MdnsUtils.js")();

    return {
        ServiceUtils: ServiceUtils,
        BridgeUtils: BridgeUtils,
        AccessoryUtils: AccessoryUtils,
        CharacteristicUtils: CharacteristicUtils,
        MdnsUtils: MdnsUtils
    };
};
