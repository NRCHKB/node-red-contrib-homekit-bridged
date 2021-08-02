import HAPServiceNodeType from '../types/HAPServiceNodeType'
import { Characteristic, CharacteristicProps, Service } from 'hap-nodejs'
import HAPServiceConfigType from '../types/HAPServiceConfigType'
import { logger } from '@nrchkb/logger'

module.exports = function (node: HAPServiceNodeType) {
    const log = logger('NRCHKB', 'CharacteristicUtils', node.config.name, node)
    const ServiceUtils = require('./ServiceUtils2')(node)

    const load = function (
        service: Service,
        config: HAPServiceConfigType
    ): { [key: string]: CharacteristicProps } {
        let characteristicProperties: {
            [key: string]: CharacteristicProps
        } = {}

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            characteristicProperties = JSON.parse(
                config.characteristicProperties
            )

            // Configure custom characteristic properties
            for (const key in characteristicProperties) {
                if (!characteristicProperties.hasOwnProperty(key)) continue

                const characteristic = service.getCharacteristic(
                    // @ts-ignore
                    Characteristic[key]
                )

                if (characteristic && characteristicProperties[key]) {
                    log.debug(`Found Characteristic Properties for ${key}`)
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

        allCharacteristics.map((characteristic) => {
            const cKey = characteristic.constructor.name

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
