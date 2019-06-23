module.exports = function (node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Service = HapNodeJS.Service;
    const Characteristic = HapNodeJS.Characteristic;

    const CameraSource = require("../cameraSource").Camera;

    const onCharacteristicChange = function (info, callback) {
        const topic = node.topic ? node.topic : node.topic_in;
        const msg = {payload: {}, name: node.name, topic: topic};
        const key = this.displayName.replace(/ /g, "").replace(/\./g, "_");

        msg.payload[key] = info;

        node.status({
            fill: "yellow",
            shape: "dot",
            text: key + ": " + info
        });

        setTimeout(function () {
            node.status({});
        }, 3000);

        node.send(msg);
        callback(node.accessory.reachable === true ? null : "no response");
    };

    const onInput = function (msg) {
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
            debug("msg.topic doesn't match configured value and filter is enabled. Dropping message.");
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
            if (node.supported.write.indexOf(key) < 0) {
                // characteristic is not supported
                node.warn(
                    "Characteristic " +
                    key +
                    " cannot be written.\nTry one of these: " +
                    node.supported.write.join(", ")
                );
            } else {
                let characteristic = node.service.getCharacteristic(Characteristic[key]);
                const noResponseMsg = "NO_RESPONSE";

                if (msg.payload[key] === noResponseMsg) {
                    node.accessory.updateReachability(false);
                    characteristic.updateValue(new Error(noResponseMsg));

                    return;
                }

                node.accessory.updateReachability(true);

                if (context !== null) {
                    characteristic.updateValue(msg.payload[key], undefined, context);
                } else {
                    characteristic.updateValue(msg.payload[key]);
                }
            }
        });
    };

    const onClose = function (removed, done) {
        const characteristics = node.service.characteristics.concat(
            node.service.optionalCharacteristics
        );

        characteristics.forEach(function (characteristic) {
            characteristic.removeAllListeners("get");
            characteristic.removeAllListeners("set");
        });

        if (!node.isParentNode) {
            node.parentService.removeLinkedService(node.service);
        }

        if (removed) {
            // This node has been deleted
            if (node.isParentNode) {
                node.bridge.removeBridgedAccessories([node.accessory]);
                node.accessory.destroy();
            }

            node.accessory.removeService(node.service);
        } else {
            // This node is being restarted
            node.accessory = null;
        }

        done();
    };

    /**
     * serviceInformation
     *  name
     *  UUID
     *  serviceName
     */
    const getOrCreate = function (accessory, serviceInformation, parentService) {
        let service = null;
        const newService = new Service[serviceInformation.serviceName](serviceInformation.name, serviceInformation.UUID);
        debug("Looking for service with UUID '" + serviceInformation.UUID + "'...");

        for (let i in accessory.services) {
            if (!accessory.services.hasOwnProperty(i)) {
                continue;
            }

            const existingService = accessory.services[i];

            if (
                newService.UUID === existingService.UUID &&
                newService.subtype === existingService.subtype
            ) {
                service = existingService;
                debug("... found it! Updating it.");
                service.getCharacteristic(Characteristic.Name).setValue(serviceInformation.name);
                break;
            }
        }

        if (!service) {
            debug("... didn't find it. Adding new " + serviceInformation.serviceName + " service.");

            if (serviceInformation.serviceName === "CameraControl") {
                configureCameraSource(accessory, newService, serviceInformation.config);
                service = newService;
            } else {
                service = accessory.addService(newService);
            }
        }

        if (parentService) {
            if (serviceInformation.serviceName === "CameraControl") {
                //We don't add or link it since configureCameraSource do this already.
                debug("... and adding service to accessory.");
            } else {
                debug("... and linking service to parent.");
                parentService.addLinkedService(service);
            }
        }

        return service;
    };

    const configureCameraSource = function (accessory, service, config) {
        if (config.cameraConfigSource) {
            debug("Configuring Camera Source");

            if (!config.cameraConfigVideoProcessor) {
                node.error("Missing configuration for CameraControl: videoProcessor cannot be empty!");
            } else {
                accessory.configureCameraSource(new CameraSource(service, config));
            }
        } else {
            node.error("Missing configuration for CameraControl.");
        }
    };

    return {
        getOrCreate: getOrCreate,
        onCharacteristicChange: onCharacteristicChange,
        onInput: onInput,
        onClose: onClose
    };
};
