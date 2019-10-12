module.exports = function(node) {
    ;('use strict')
    const debug = require('debug')('NRCHKB')
    const HapNodeJS = require('hap-nodejs')
    const Characteristic = HapNodeJS.Characteristic
    const ServiceUtils = require('./ServiceUtils.js')(node)

    const load = function(service, config) {
        let characteristicProperties = {}

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            characteristicProperties = JSON.parse(
                config.characteristicProperties
            )

            // Configure custom characteristic properties
            for (let key in characteristicProperties) {
                if (!characteristicProperties.hasOwnProperty(key)) continue

                const characteristic = service.getCharacteristic(
                    Characteristic[key]
                )

                if (characteristic && characteristicProperties[key]) {
                    characteristic.setProps(characteristicProperties[key])
                }
            }
        }

        return characteristicProperties
    }

    const subscribeAndGetSupported = function(service) {
        const supported = []

        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        )

        allCharacteristics.map(function(characteristic) {
            const cKey = characteristic.displayName
                .replace(/ /g, '')
                .replace(/\./g, '_')

            supported.push(cKey)

            characteristic.on('get', function(callback) {
                if (node.accessory.reachable === true) {
                    callback(null, characteristic.value)
                } else {
                    callback('no response', null)
                }
            })

            characteristic.on('set', ServiceUtils.onCharacteristicChange)

            //TODO: Remove when persist table is here
            //Allow for negative temperatures
            if (characteristic.displayName === 'Current Temperature') {
                characteristic.props.minValue = -100
            }
        })

        return supported
    }

    return {
        load: load,
        subscribeAndGetSupported: subscribeAndGetSupported,
    }
}
