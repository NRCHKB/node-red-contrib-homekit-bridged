import { logger } from '@nrchkb/logger'
import { Characteristic, CharacteristicProps, Service } from 'hap-nodejs'

import HAPServiceConfigType from '../types/HAPServiceConfigType'
import HAPServiceNodeType from '../types/HAPServiceNodeType'

module.exports = function (node: HAPServiceNodeType) {
    const log = logger('NRCHKB', 'CharacteristicUtils', node.config.name, node)
    const ServiceUtils = require('./ServiceUtils')(node)

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
                config.characteristicProperties.replace(
                    /\${(.*?)}/g,
                    (_, envName) =>
                        node.RED.util.evaluateNodeProperty(
                            envName,
                            'env',
                            node,
                            {}
                        )
                )
            )

            log.trace('Evaluating value:')
            log.trace(config.characteristicProperties)
            log.trace('Evaluated as:')
            log.trace(JSON.stringify(characteristicProperties))

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

        // Listen to characteristic events and store the listener functions
        // to be able to remove them later
        node.onCharacteristicGet = ServiceUtils.onCharacteristicGet
        node.onCharacteristicSet = ServiceUtils.onCharacteristicSet(
            service.characteristics
        )
        node.onCharacteristicChange = ServiceUtils.onCharacteristicChange(
            service.characteristics
        )

        allCharacteristics.map((characteristic) => {
            const cKey = characteristic.constructor.name

            supported.push(cKey)

            characteristic.on('get', node.onCharacteristicGet)
            characteristic.on('set', node.onCharacteristicSet)
            characteristic.on('change', node.onCharacteristicChange)

            //TODO: Remove when persist table is here
            //Allow for negative temperatures
            if (characteristic.displayName === 'Current Temperature') {
                characteristic.props.minValue = -100
            }
        })

        // Removing accidental duplicate values
        return [...new Set(supported)]
    }

    return {
        load: load,
        subscribeAndGetSupported: subscribeAndGetSupported,
    }
}
