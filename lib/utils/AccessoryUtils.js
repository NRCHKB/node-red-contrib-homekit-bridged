module.exports = function(node) {
    const debug = require('debug')('NRCHKB')
    const HapNodeJS = require('hap-nodejs')
    const Accessory = HapNodeJS.Accessory
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    /**
     * accessoryInformation
     *  name
     *  UUID
     *  manufacturer
     *  serialNo
     *  model
     */
    const getOrCreate = function(bridge, accessoryInformation, subtypeUUID) {
        let accessory = null
        let services = []

        // create accessory object
        debug(
            'Looking for accessory with service subtype \'' +
                subtypeUUID +
                '\'...'
        )

        // Try to find an accessory which contains a service with the same
        // subtype. Since the UUID of the accessory might have changed the
        // subtype will be used instead.
        accessory = bridge.bridgedAccessories.find(a => {
            let service = a.services.find(s => {
                return s.subtype === subtypeUUID
            })

            return service !== undefined
        })

        if (accessory) {
            // An accessory was found
            let info = accessory.getService(Service.AccessoryInformation)

            if (
                info.getCharacteristic(Characteristic.Manufacturer).value !==
                    accessoryInformation.manufacturer ||
                info.getCharacteristic(Characteristic.Model).value !==
                    accessoryInformation.model ||
                info.getCharacteristic(Characteristic.Name).value !==
                    accessoryInformation.name ||
                info.getCharacteristic(Characteristic.SerialNumber).value !==
                    accessoryInformation.serialNo
            ) {
                debug(
                    '... Manufacturer, Model, Name or Serial Number changed! ' +
                        'Replacing it.'
                )

                // Removing services from accessory and storing them for later
                accessory.services
                    .filter(
                        service =>
                            service.UUID !== Service.AccessoryInformation.UUID
                    )
                    .forEach(service => {
                        accessory.removeService(service)
                        services.push(service)
                    })

                // Remove old Accessory
                bridge.removeBridgedAccessory(accessory, false)
                accessory.destroy()
                accessory = null
            } else {
                debug('... found it! Updating it.')
            }
        } else {
            debug(
                '... didn\'t find it. Adding new accessory with name \'' +
                    accessoryInformation.name +
                    '\' and UUID \'' +
                    accessoryInformation.UUID +
                    '\''
            )
        }

        if (!accessory) {
            // A new accessory will be created.
            accessory = new Accessory(
                accessoryInformation.name,
                accessoryInformation.UUID
            )

            // If the accessory is getting replaced then all of the old
            // services (except AccessoryInformation) will be transfered to
            // the new accessory.
            services.forEach(service => {
                accessory.addService(service)
            })

            // Setting manufacurer data. Accoring to the HomekitADK specs this
            // data must persist throughout the lifetime of the accessory and
            // may not be changed.
            accessory
                .getService(Service.AccessoryInformation)
                .setCharacteristic(
                    Characteristic.Name,
                    accessoryInformation.name
                )
                .setCharacteristic(
                    Characteristic.Manufacturer,
                    accessoryInformation.manufacturer
                )
                .setCharacteristic(
                    Characteristic.SerialNumber,
                    accessoryInformation.serialNo
                )
                .setCharacteristic(
                    Characteristic.Model,
                    accessoryInformation.model
                )

            // Adding new accessory to the bridge.
            bridge.addBridgedAccessories([accessory])
        }

        accessory
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Identify, true)

        debug(
            'Bridge now has ' +
                bridge.bridgedAccessories.length +
                ' accessories.'
        )

        return accessory
    }

    const onIdentify = function(paired, callback) {
        if (paired) {
            debug(
                'Identify called on paired Accessory ' +
                    node.accessory.displayName
            )
        } else {
            debug(
                'Identify called on unpaired Accessory ' +
                    node.accessory.displayName
            )
        }

        let nodes = node.childNodes

        for (let i = 0, len = nodes.length; i < len; i++) {
            const topic = nodes[i].topic ? nodes[i].topic : nodes[i].topic_in
            const msg = {
                payload: { Identify: 1 },
                name: nodes[i].name,
                topic: topic,
            }

            nodes[i].status({
                fill: 'yellow',
                shape: 'dot',
                text: 'Identify : 1',
            })

            setTimeout(function() {
                nodes[i].status({})
            }, 3000)

            nodes[i].send(msg)
        }
        callback()
    }

    return {
        getOrCreate: getOrCreate,
        onIdentify: onIdentify,
    }
}
