import { logger } from '@nrchkb/logger'
import { Accessory, Service } from 'hap-nodejs'

import AccessoryInformationType from '../types/AccessoryInformationType'
import HAPServiceNodeType from '../types/HAPServiceNodeType'

module.exports = function (node: HAPServiceNodeType) {
    const HapNodeJS = require('hap-nodejs')
    const Accessory = HapNodeJS.Accessory
    const Service = HapNodeJS.Service
    const Characteristic = HapNodeJS.Characteristic

    const log = logger('NRCHKB', 'AccessoryUtils', node.config.name, node)

    const getOrCreate = function (
        host: Accessory,
        accessoryInformation: AccessoryInformationType,
        subtypeUUID: string
    ) {
        let accessory: Accessory | undefined
        const services: Service[] = []

        // create accessory object
        log.debug(
            `Looking for accessory with service subtype ${subtypeUUID} ...`
        )

        // Try to find an accessory which contains a service with the same
        // subtype. Since the UUID of the accessory might have changed the
        // subtype will be used instead.
        accessory = host.bridgedAccessories.find((a) => {
            const service = a.services.find((s) => {
                return s.subtype === subtypeUUID
            })

            return service !== undefined
        })

        if (accessory) {
            // An accessory was found
            const accessoryInformationService =
                accessory.getService(Service.AccessoryInformation) ||
                accessory.addService(Service.AccessoryInformation)

            if (
                accessoryInformationService.getCharacteristic(
                    Characteristic.Manufacturer
                ).value !== accessoryInformation.manufacturer ||
                accessoryInformationService.getCharacteristic(
                    Characteristic.Model
                ).value !== accessoryInformation.model ||
                accessoryInformationService.getCharacteristic(
                    Characteristic.Name
                ).value !== accessoryInformation.name ||
                accessoryInformationService.getCharacteristic(
                    Characteristic.SerialNumber
                ).value !== accessoryInformation.serialNo
            ) {
                log.debug(
                    '... Manufacturer, Model, Name or Serial Number changed! Replacing it.'
                )

                // Removing services from accessory and storing them for later
                accessory.services
                    .filter(
                        (service) =>
                            service.UUID !== Service.AccessoryInformation.UUID
                    )
                    .forEach((service) => {
                        accessory?.removeService(service)
                        services.push(service)
                    })

                // Remove old Accessory
                host.removeBridgedAccessory(accessory, false)
                accessory.destroy()
                accessory = undefined
            } else {
                log.debug('... found it! Updating it.')
            }
        } else {
            log.debug(
                `... didn't find it. Adding new accessory with name ${accessoryInformation.name} and UUID ${accessoryInformation.UUID}`
            )
        }

        let accessoryInformationService: Service | undefined

        if (!accessory) {
            // A new accessory will be created.
            accessory = new Accessory(
                accessoryInformation.name,
                accessoryInformation.UUID
            )

            // If the accessory is getting replaced then all of the old
            // services (except AccessoryInformation) will be transferred to
            // the new accessory.
            services.forEach((service) => {
                accessory?.addService(service)
            })

            accessoryInformationService =
                accessory?.getService(Service.AccessoryInformation) ||
                accessory?.addService(Service.AccessoryInformation)

            // Setting manufacturer data. According to the HomekitADK specs this
            // data must persist throughout the lifetime of the accessory and
            // may not be changed.
            accessoryInformationService
                ?.setCharacteristic(
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

            const revisionRegex = /\d+\.\d+\.\d+/

            if (
                accessoryInformation.firmwareRev &&
                accessoryInformation.firmwareRev.match(revisionRegex)
            ) {
                accessoryInformationService?.setCharacteristic(
                    Characteristic.FirmwareRevision,
                    accessoryInformation.firmwareRev
                )
            }

            if (
                accessoryInformation.hardwareRev &&
                accessoryInformation.hardwareRev.match(revisionRegex)
            ) {
                accessoryInformationService?.setCharacteristic(
                    Characteristic.HardwareRevision,
                    accessoryInformation.hardwareRev
                )
            }

            if (
                accessoryInformation.softwareRev &&
                accessoryInformation.softwareRev.match(revisionRegex)
            ) {
                accessoryInformationService?.setCharacteristic(
                    Characteristic.SoftwareRevision,
                    accessoryInformation.softwareRev
                )
            }

            // Adding new accessory to the bridge.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            host.addBridgedAccessories([accessory!])
        } else {
            accessoryInformationService =
                accessory?.getService(Service.AccessoryInformation) ||
                accessory?.addService(Service.AccessoryInformation)
        }

        accessoryInformationService?.setCharacteristic(
            Characteristic.Identify,
            true
        )

        log.debug(
            `Bridge now has ${host.bridgedAccessories.length} accessories.`
        )

        return accessory
    }

    const onIdentify = function (paired: boolean, callback: () => any) {
        if (paired) {
            log.debug(
                `Identify called on paired Accessory ${node.accessory.displayName}`
            )
        } else {
            log.debug(
                `Identify called on unpaired Accessory ${node.accessory.displayName}`
            )
        }

        const nodes = node.childNodes ?? []

        for (let i = 0, len = nodes.length; i < len; i++) {
            const topic = nodes[i].config.topic
                ? nodes[i].config.topic
                : nodes[i].topic_in
            const msg = {
                payload: { Identify: 1 },
                name: nodes[i].name,
                topic: topic,
            }

            const statusId = nodes[i].nodeStatusUtils.setStatus({
                fill: 'yellow',
                shape: 'dot',
                text: 'Identify : 1',
            })

            setTimeout(function () {
                nodes[i].nodeStatusUtils.clearStatus(statusId)
            }, 3000)

            nodes[i].send([msg, msg])
        }
        callback()
    }

    return {
        getOrCreate,
        onIdentify,
    }
}
