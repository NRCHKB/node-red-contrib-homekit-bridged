module.exports = function(RED) {
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;
    const uuid = HapNodeJS.uuid;
    let publishTimers = {};

    const init = function (config) {
        RED.nodes.createNode(this, config);

        const isParentNode = typeof config.isParent === "boolean" ? config.isParent : true;

        if (isParentNode) {
            debug("Starting Parent Service " + config.name);
            configure(this, config);
        } else {
            waitForParent(this, config)
                .then(() => {
                    debug("Starting Linked Service " + config.name);
                    configure(this, config);
                })
                .catch(e => {
                    this.status({
                        fill: "red",
                        shape: "ring",
                        text: "Error while starting Linked Service"
                    });

                    this.error("Error while starting Linked Service " + config.name + ": ", e);
                });
        }
    };

    function waitForParent (node, config) {
        return new Promise((resolve, reject) => {
            node.status({
                fill: "yellow",
                shape: "ring",
                text: "Waiting for Parent Service"
            });

            const checkAndWait = () => {
                if (RED.nodes.getNode(config.parentService)){
                    resolve();
                } else {
                    setTimeout(checkAndWait, 1000);
                }
            };
            checkAndWait();
        });
    }

    const configure = function (node, config) {
        const Utils = require("./utils")(node);
        const AccessoryUtils = Utils.AccessoryUtils;
        const BridgeUtils = Utils.BridgeUtils;
        const CharacteristicUtils = Utils.CharacteristicUtils;
        const ServiceUtils = Utils.ServiceUtils;

        const isParentNode = typeof config.isParent === "boolean" ? config.isParent : true;

        node.bridgeNode;
        let parentNode;
        let parentService;

        if (isParentNode) {
            node.bridgeNode = RED.nodes.getNode(config.bridge);
            node.childNodes = [];
            node.childNodes.push(node);
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

            node.bridgeNode = parentNode.bridgeNode;
            parentNode.childNodes.push(node);
        }

        // Service node properties
        node.name = config.name;
        node.topic = config.topic;
        node.filter = config.filter;
        node.serviceName = config.serviceName;
        node.manufacturer = config.manufacturer;
        node.serialNo = config.serialNo;
        node.model = config.model;
        node.accessoryType = config.accessoryType;
        const bridge = node.bridgeNode.bridge;
        const subtypeUUID = uuid.generate(node.id);
        const accessoryUUID = uuid.generate("A" + node.id);

        // Look for existing Accessory or create a new one
        let accessory;
        if (isParentNode) {
            accessory = AccessoryUtils.getOrCreate(bridge, {
                name: node.name,
                UUID: accessoryUUID,
                manufacturer: node.manufacturer,
                serialNo: node.serialNo,
                model: node.model
            });
            accessory.on("identify", AccessoryUtils.onIdentify);
        } else {
            accessory = parentNode.accessory;
        }
        node.accessory = accessory;
        
        // Look for existing Service or create a new one
        const service = ServiceUtils.getOrCreate(accessory, {
            name: node.name,
            UUID: subtypeUUID,
            serviceName: node.serviceName
        }, parentService);
        node.service = service;
        
        // Init characteristics and generate node input support characterisitics list
        node.supported = CharacteristicUtils.initAllCharacteristics(node, service, config);
        
        // Link service only after the service has been initialized.
        if (parentService) {
            debug("... and linking service to parent.");
            parentService.addLinkedService(service);
        };
        
        publishTimers = BridgeUtils.delayedPublish(node, publishTimers);
        node.on("input", ServiceUtils.onInput);
        node.on("close", ServiceUtils.onClose);

        node.status({
            fill: "yellow",
            shape: "ring",
            text: node.bridgeNode.pinCode
        });

    };

    return {
        init: init
    };
};
