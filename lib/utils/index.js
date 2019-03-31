module.exports = function (RED, node) {
    const ServiceUtils = require("./ServiceUtils.js")(RED,  node);
    const BridgeUtils = require("./BridgeUtils.js")(RED,  node);
    const AccessoryUtils = require("./AccessoryUtils.js")(RED,  node);
    const CharacteristicUtils = require("./CharacteristicUtils.js")(RED,  node);
    const MdnsUtils = require("./MdnsUtils.js")(RED);
    const ServerUtils = require("./ServerUtils.js")(RED);

    return {
        ServiceUtils: ServiceUtils,
        BridgeUtils: BridgeUtils,
        AccessoryUtils: AccessoryUtils,
        CharacteristicUtils: CharacteristicUtils,
        MdnsUtils: MdnsUtils,
        ServerUtils: ServerUtils
    };
};
