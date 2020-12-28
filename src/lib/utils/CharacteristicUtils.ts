import HAPServiceNodeType from '../types/HAPServiceNodeType'
import { Service } from 'hap-nodejs'
import HAPServiceConfigType from '../types/HAPServiceConfigType'

module.exports = function (node: HAPServiceNodeType) {
    const HapNodeJS = require('hap-nodejs')
    const Characteristic = HapNodeJS.Characteristic
    const ServiceUtils = require('./ServiceUtils')(node)

    const load = function (service: Service, config: HAPServiceConfigType) {
        let characteristicProperties: { [key: string]: any } = {}

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

    const subscribeAndGetSupported = function (service: Service) {
        const supported: string[] = []

        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        )

        allCharacteristics.map(function (characteristic) {
            const cKey = characteristic.displayName
                .replace(/ /g, '')
                .replace(/\./g, '_')

            supported.push(cKey)

            // Listen to characteristic events and store the listener functions
            // to be able to remove them later
            node.onCharacteristicGet = ServiceUtils.onCharacteristicGet
            node.onCharacteristicSet = ServiceUtils.onCharacteristicSet
            node.onCharacteristicChange = ServiceUtils.onCharacteristicChange
            characteristic.on('get', node.onCharacteristicGet)
            characteristic.on('set', node.onCharacteristicSet)
            characteristic.on('change', node.onCharacteristicChange)

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
