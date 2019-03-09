module.exports = function(RED) {
    const HapNodeJS = require("hap-nodejs");
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;
    const uuid = HapNodeJS.uuid;
    let publishTimers = {};

    const init = function (config) {
        const Utils = require("./utils")(this);
        const AccessoryUtils = Utils.AccessoryUtils;
        const BridgeUtils = Utils.BridgeUtils;
        const CharacteristicUtils = Utils.CharacteristicUtils;
        const ServiceUtils = Utils.ServiceUtils;

        RED.nodes.createNode(this, config);

        const isParentNode = typeof config.isParent === "boolean" ? config.isParent : true;

        this.bridgeNode;
        let parentNode;
        let parentService;

        if (isParentNode) {
            this.bridgeNode = RED.nodes.getNode(config.bridge);
        } else {
            // Retrieve parent service node
            parentNode = RED.nodes.getNode(config.parentService);

            if (!parentNode) {
                throw Error("Parent Node not assigned");
            }

            parentService = parentNode.service;

            if (!parentService) {
                throw Error("Parent Service not assigned");
            }

            this.bridgeNode = parentNode.bridgeNode;
        }

        // Service node properties
        this.name = config.name;
        this.topic = config.topic;
        this.filter = config.filter;
        this.serviceName = config.serviceName;
        this.manufacturer = config.manufacturer;
        this.serialNo = config.serialNo;
        this.model = config.model;
        this.accessoryType = config.accessoryType;

        const bridge = this.bridgeNode.bridge;

        // Generate UUID from node id
        const subtypeUUID = uuid.generate(this.id);
        const accessoryUUID = uuid.generate("A" + this.id);

        // Look for existing Accessory or create a new one
        let accessory;
        if (isParentNode) {
            accessory = AccessoryUtils.getOrCreate(bridge, {
                name: this.name,
                UUID: accessoryUUID,
                manufacturer: this.manufacturer,
                serialNo: this.serialNo,
                model: this.model
            });
        } else {
            accessory = parentNode.accessory;
        }

        // Look for existing Service or create a new one
        const service = ServiceUtils.getOrCreate(accessory, {
            name: this.name,
            UUID: subtypeUUID,
            serviceName: this.serviceName
        }, parentService);

        this.characteristicProperties = CharacteristicUtils.load(service, config);

        publishTimers = BridgeUtils.delayedPublish(this, publishTimers);

        this.service = service;
        const node = this;

        // The pinCode should be shown to the user until interaction with iOS client starts
        node.status({
            fill: "yellow",
            shape: "ring",
            text: node.bridgeNode.pinCode
        });

        // Emit message when value changes
        service.on("characteristic-change", ServiceUtils.onCharacteristicChange);

        // Which characteristics are supported?
        this.supported = CharacteristicUtils.getSupportedAndSubscribeSet(service);

        // Respond to inputs
        this.on("input", ServiceUtils.onInput);

        this.on("close", ServiceUtils.onClose);

        this.accessory = accessory;
    };

    return {
        init: init
    };
};
