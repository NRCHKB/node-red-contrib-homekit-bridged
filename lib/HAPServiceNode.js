module.exports = function(RED) {
    const HapNodeJS = require("hap-nodejs");
    const Accessory = HapNodeJS.Accessory;
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;
    const uuid = HapNodeJS.uuid;
    const publishTimers = {};

    const init = function (config) {
        let i;
        RED.nodes.createNode(this, config);

        // service node properties
        this.bridgeNode = RED.nodes.getNode(config.bridge);
        this.name = config.name;
        this.topic = config.topic;
        this.filter = config.filter;
        this.serviceName = config.serviceName;
        this.manufacturer = config.manufacturer;
        this.serialNo = config.serialNo;
        this.model = config.model;
        this.accessoryType = config.accessoryType;

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            this.characteristicProperties = JSON.parse(
                config.characteristicProperties
            );
        } else {
            this.characteristicProperties = {};
        }

        const bridge = this.bridgeNode.bridge;

        // generate UUID from node id
        const subtypeUUID = uuid.generate(this.id);
        const accessoryUUID = uuid.generate("A" + this.id);
        // create accessory object
        this.debug("Looking for accessory with UUID '" + accessoryUUID + "'...");

        let accessory = null;

        for (let i in bridge.bridgedAccessories) {
            if (!bridge.bridgedAccessories.hasOwnProperty(i)) continue;

            const existingAccessory = bridge.bridgedAccessories[i];

            if (existingAccessory.UUID === accessoryUUID) {
                accessory = existingAccessory;
                break;
            }
        }

        if (!accessory) {
            this.debug(
                "... didn't find it. Adding new accessory with name '" +
                this.name +
                "' and UUID '" +
                accessoryUUID +
                "'"
            );
            accessory = new Accessory(this.name, accessoryUUID);
            bridge.addBridgedAccessories([accessory]);
        } else {
            this.debug("... found it! Updating it.");
            accessory
                .getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Name, this.name);
        }

        accessory
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, this.serialNo)
            .setCharacteristic(Characteristic.Model, this.model);

        this.debug(
            "Bridge now has " + bridge.bridgedAccessories.length + " accessories."
        );

        // add service
        let service = null;
        const newService = new Service[this.serviceName](this.name, subtypeUUID);
        this.debug("Looking for service with UUID '" + subtypeUUID + "'...");

        for (i in accessory.services) {
            const existingService = accessory.services[i];

            if (
                newService.UUID === existingService.UUID &&
                newService.subtype === existingService.subtype
            ) {
                service = existingService;
                this.debug("... found it! Updating it.");
                service.getCharacteristic(Characteristic.Name).setValue(this.name);
                break;
            }
        }

        if (!service) {
            this.debug("... didn't find it. Adding new service.");
            service = accessory.addService(newService);
        }

        // configure custom characteristic properties
        for (let key in this.characteristicProperties) {
            if (!this.characteristicProperties.hasOwnProperty(key)) continue;

            let characteristic = service.getCharacteristic(Characteristic[key]);

            if (characteristic && this.characteristicProperties[key]) {
                characteristic.setProps(this.characteristicProperties[key]);
            }
        }

        // publish accessory after the service has been added
        // BUT ONLY after 5 seconds with no new service have passed
        // otherwise, our bridge would get published too early during startup and
        // services being added after that point would be seen as "new" in iOS,
        // removing all parameters set (Rooms, Groups, Scenes...)
        if (!this.bridgeNode.published) {
            if (publishTimers[this.bridgeNode.id] !== undefined) {
                clearTimeout(publishTimers[this.bridgeNode.id]);
            }

            publishTimers[this.bridgeNode.id] = setTimeout(
                this.bridgeNode.publish,
                5000
            );
        }

        this.service = service;
        const node = this;

        // the pinCode should be shown to the user until interaction with
        // iOS client starts
        node.status({
            fill: "yellow",
            shape: "ring",
            text: node.bridgeNode.pinCode
        });

        // emit message when value changes
        service.on("characteristic-change", function (info) {
            const topic = node.topic ? node.topic : node.topic_in;
            const msg = {payload: {}, hap: info, name: node.name, topic: topic};
            const key = info.characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");

            msg.payload[key] = info.newValue;

            node.status({
                fill: "yellow",
                shape: "dot",
                text: key + ": " + info.newValue
            });

            setTimeout(function () {
                node.status({});
            }, 3000);

            node.send(msg);
        });

        // which characteristics are supported?
        const supported = {read: [], write: []};

        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        );

        allCharacteristics.map(function (characteristic, index) {
            const cKey = characteristic.displayName.replace(/ /g, "").replace(/\./g, "_");
            if (characteristic.props.perms.indexOf("pw") > -1) {
                supported.read.push(cKey);
            }

            if (
                characteristic.props.perms.indexOf("pr") +
                characteristic.props.perms.indexOf("ev") >
                -2
            ) {
                supported.write.push(cKey);
            }

            //Allow for negative temperatures
            if (characteristic.displayName === "Current Temperature") {
                characteristic.props.minValue = -100;
            }
        });

        // respond to inputs
        this.on("input", function (msg) {
            if (msg.hasOwnProperty("payload")) {
                // payload must be an object
                const type = typeof msg.payload;

                if (type !== "object") {
                    node.warn("Invalid payload type: " + type);
                    return;
                }
            } else {
                node.warn("Invalid message (payload missing)");
                return;
            }

            const topic = node.topic ? node.topic : node.name;
            if (node.filter === true && msg.topic !== topic) {
                this.debug("msg.topic doesn't match configured value and filter is enabled. Dropping message.");
                return;
            }

            let context = null;
            if (msg.payload.hasOwnProperty("Context")) {
                context = msg.payload.Context;
                delete msg.payload.Context;
            }

            node.topic_in = msg.topic ? msg.topic : "";

            // iterate over characteristics to be written
            Object.keys(msg.payload).map(function (key, index) {
                if (supported.write.indexOf(key) < 0) {
                    // characteristic is not supported
                    node.warn(
                        "Characteristic " +
                        key +
                        " cannot be written.\nTry one of these: " +
                        supported.write.join(", ")
                    );
                } else {
                    let characteristic = service.getCharacteristic(Characteristic[key]);
                    const noResponseMsg = "NO_RESPONSE";

                    if (msg.payload[key] === noResponseMsg) {
                        characteristic.setValue(new Error(noResponseMsg));

                        return;
                    }

                    if (context !== null) {
                        characteristic.setValue(msg.payload[key], undefined, context);
                    } else {
                        characteristic.setValue(msg.payload[key]);
                    }
                }
            });
        });

        this.on("close", function (removed, done) {
            if (removed) {
                // This node has been deleted
                accessory.removeService(service);
                bridge.removeBridgedAccessory(accessory, false);
                accessory.destroy();
            } else {
                accessory = null;
                // This node is being restarted
            }
            done();
        });

        this.accessory = accessory;
    };

    return {
        init: init
    };
};
