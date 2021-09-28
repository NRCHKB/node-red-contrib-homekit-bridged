import HAPService2NodeType from '../types/HAPService2NodeType'
import { Characteristic, CharacteristicProps, Service } from 'hap-nodejs'
import HAPService2ConfigType from '../types/HAPService2ConfigType'
import { logger } from '@nrchkb/logger'

module.exports = function (node: HAPService2NodeType) {
    const log = logger('NRCHKB', 'CharacteristicUtils', node.config.name, node)
    const ServiceUtils = require('./ServiceUtils2')(node)

    const load = function (
        service: Service,
        config: HAPService2ConfigType
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
                    /\${(.*?)}/,
                    (_, envName) =>
                        node.RED.util.evaluateNodeProperty(
                            envName,
                            'env',
                            node,
                            {}
                        )
                )
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
            node.onCharacteristicGet =
                ServiceUtils.onCharacteristicGet(allCharacteristics)
            node.onCharacteristicSet =
                ServiceUtils.onCharacteristicSet(allCharacteristics)
            node.onCharacteristicChange =
                ServiceUtils.onCharacteristicChange(allCharacteristics)
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
