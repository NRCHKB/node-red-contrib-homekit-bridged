import {
    Characteristic,
    type CharacteristicProps,
    type Service,
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'

import type HAPServiceNodeType from '../types/HAPServiceNodeType'

const ENV_VAR_REGEX = /\${(.*?)}/g

type CharacteristicConfig = {
    characteristicProperties?: string
}

type ServiceUtilsFactory<Node extends HAPServiceNodeType> = (node: Node) => {
    onCharacteristicGet:
        | HAPServiceNodeType['onCharacteristicGet']
        | ((
              allCharacteristics: Characteristic[]
          ) => HAPServiceNodeType['onCharacteristicGet'])
    onCharacteristicSet: (
        allCharacteristics: Characteristic[]
    ) => HAPServiceNodeType['onCharacteristicSet']
    onCharacteristicChange: (
        allCharacteristics: Characteristic[]
    ) => HAPServiceNodeType['onCharacteristicChange']
}

const buildCharacteristicUtilsBase = <
    Config extends CharacteristicConfig,
    Node extends HAPServiceNodeType,
>(
    node: Node,
    serviceUtilsFactory: ServiceUtilsFactory<Node>,
    options: {
        getHandlerUsesCharacteristics: boolean
    }
) => {
    const log = logger('NRCHKB', 'CharacteristicUtils', node.config.name, node)
    const ServiceUtils = serviceUtilsFactory(node)

    const load = (
        service: Service,
        config: Config
    ): { [key: string]: CharacteristicProps } => {
        let characteristicProperties: {
            [key: string]: CharacteristicProps
        } = {}

        if (
            config.characteristicProperties &&
            config.characteristicProperties.length > 0
        ) {
            try {
                characteristicProperties = JSON.parse(
                    config.characteristicProperties.replace(
                        ENV_VAR_REGEX,
                        (_, envName) =>
                            node.RED.util.evaluateNodeProperty(
                                envName,
                                'env',
                                node,
                                {}
                            )
                    )
                )
            } catch (error) {
                log.error(
                    `Invalid characteristicProperties JSON, ignoring custom properties: ${error}`
                )
                node.nodeStatusUtils.setStatus({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Invalid characteristic properties',
                })
                return characteristicProperties
            }

            log.trace('Evaluating value:')
            log.trace(config.characteristicProperties)
            log.trace('Evaluated as:')
            log.trace(JSON.stringify(characteristicProperties))

            // Configure custom characteristic properties
            for (const key in characteristicProperties) {
                if (!Object.hasOwn(characteristicProperties, key)) continue

                const characteristic = service.getCharacteristic(
                    // @ts-expect-error
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

    const subscribeAndGetSupported = (service: Service) => {
        const supported = new Set<string>()

        const allCharacteristics = service.characteristics.concat(
            service.optionalCharacteristics
        )

        // Listen to characteristic events and store the listener functions
        // to be able to remove them later
        node.onCharacteristicGet = options.getHandlerUsesCharacteristics
            ? (
                  ServiceUtils.onCharacteristicGet as (
                      allCharacteristics: Characteristic[]
                  ) => HAPServiceNodeType['onCharacteristicGet']
              )(service.characteristics)
            : (ServiceUtils.onCharacteristicGet as HAPServiceNodeType['onCharacteristicGet'])
        node.onCharacteristicSet = ServiceUtils.onCharacteristicSet(
            service.characteristics
        )
        node.onCharacteristicChange = ServiceUtils.onCharacteristicChange(
            service.characteristics
        )

        allCharacteristics.forEach((characteristic) => {
            const cKey = characteristic.constructor.name

            supported.add(cKey)

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
        load,
        subscribeAndGetSupported,
    }
}

export = buildCharacteristicUtilsBase
