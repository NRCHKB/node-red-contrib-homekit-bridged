import {
    type Accessory,
    type Characteristic,
    type CharacteristicChange,
    CharacteristicEventTypes,
    type CharacteristicGetCallback,
    type CharacteristicSetCallback,
    type CharacteristicValue,
    HAPStatus,
    HapStatusError,
    type Service,
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import { registerEmbeddedPlugins } from '../../plugins/embedded'
import {
    getPlugin,
    NRCHKBPluginConfigEntry,
    registerNodeRedPlugins,
} from '../../plugins/registry'
import type {
    HAPConnection,
    HAPUsername,
    SessionIdentifier,
} from '../hap/hap-nodejs'
import NRCHKBError from '../NRCHKBError'
import { Storage } from '../Storage'
import type HAPService2ConfigType from '../types/HAPService2ConfigType'
import type HAPService2NodeType from '../types/HAPService2NodeType'

import buildServiceUtils = require('./ServiceUtils')

// register once in the application

registerEmbeddedPlugins()

const describeContext = (context: unknown): string => {
    if (context === null) {
        return 'null'
    }

    if (context === undefined) {
        return 'undefined'
    }

    const type = typeof context
    if (type !== 'object') {
        return String(context)
    }

    if (Array.isArray(context)) {
        return `Array(${context.length})`
    }

    const keys = Object.keys(context as Record<string, unknown>)
    return keys.length > 0
        ? `Object(${keys.slice(0, 5).join(',')}${keys.length > 5 ? ',...' : ''})`
        : 'Object'
}

const describeSupported = (supported: Set<string>): string =>
    Array.from(supported).join("', '")

const isPluginEntry = (value: unknown): value is NRCHKBPluginConfigEntry => {
    if (typeof value !== 'object' || value === null) {
        return false
    }

    const id = (value as Record<string, unknown>).id
    return typeof id === 'string' && id.trim().length > 0
}

const parsePluginEntries = (
    value: unknown,
    log: ReturnType<typeof logger>
): NRCHKBPluginConfigEntry[] => {
    if (!value) {
        return []
    }

    const normalize = (entries: unknown[]): NRCHKBPluginConfigEntry[] => {
        const validEntries = entries.filter(isPluginEntry)
        if (validEntries.length !== entries.length) {
            log.error('Skipping malformed plugin configuration entries.')
        }
        return validEntries
    }

    if (Array.isArray(value)) {
        return normalize(value)
    }

    if (typeof value !== 'string') {
        log.error('Plugin configuration must be an array or JSON string.')
        return []
    }

    try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed) ? normalize(parsed) : []
    } catch (error) {
        log.error(`Failed to parse plugin configuration due to ${error}`)
        return []
    }
}

const buildServiceUtils2 = (node: HAPService2NodeType) => {
    const log = logger('NRCHKB', 'ServiceUtils2', node.config.name, node)

    registerNodeRedPlugins(node.RED)

    const ServiceUtilsLegacy = buildServiceUtils(node)

    const { Service, Characteristic } = require('@homebridge/hap-nodejs')

    const NO_RESPONSE_MSG = 'NO_RESPONSE'
    const isLegacyOutputMode = () => node.config.outputMode === 'legacy'

    type HAPServiceNodeEvent = {
        name: CharacteristicEventTypes // Event type
        context?: {
            callbackID?: string // ID used to update Characteristic value with get event
            key?: string // Characteristic key
            reason?: string
        } & Record<string, unknown> // Additional event data provided by event caller
    }

    type HAPServiceMessage = {
        payload?: { [key: string]: any }
        hap?: {
            context?: Record<string, unknown>
            oldValue?: any
            newValue?: any
            reachable?: boolean
            event?: HAPServiceNodeEvent
            session?: {
                sessionID?: SessionIdentifier
                username?: HAPUsername
                remoteAddress?: string
                localAddress?: string
                httpPort?: number
            }
            allChars: { [key: string]: any }
        }
        name?: string
        topic?: string
    }

    const output = function (
        this: Characteristic,
        allCharacteristics: Characteristic[],
        event: CharacteristicEventTypes | HAPServiceNodeEvent,
        { context, oldValue, newValue }: any,
        connection?: HAPConnection
    ) {
        const eventObject = typeof event === 'object' ? event : { name: event }

        log.debug(
            `${eventObject.name} event, oldValue: ${oldValue}, newValue: ${newValue}, connection ${connection?.sessionID}`
        )

        const msg: HAPServiceMessage = {
            name: node.name,
            topic: node.config.topic ? node.config.topic : node.topic_in,
        }
        msg.payload = {}
        const allChars: { [key: string]: any } = {}
        for (const singleChar of allCharacteristics) {
            const cKey = singleChar.constructor.name
            allChars[cKey] = singleChar.value
        }
        msg.hap = {
            event: eventObject,
            allChars,
            oldValue,
        }

        if (context) {
            msg.hap.context = context
        }

        const key = this.constructor.name

        msg.hap.reachable = node.reachable ?? node.parentNode?.reachable

        if (msg.hap.reachable === false) {
            ;[node, ...(node.childNodes ?? [])].forEach((n) => {
                n.nodeStatusUtils.setStatus({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Not reachable',
                    type: 'NO_RESPONSE',
                })
            })
        } else {
            msg.hap.newValue = newValue

            node.nodeStatusUtils.setStatus(
                {
                    fill: 'yellow',
                    shape: 'dot',
                    text: `[${eventObject.name}] ${key}${
                        newValue !== undefined ? `: ${newValue}` : ''
                    }`,
                },
                3000
            )

            node.childNodes?.forEach((n) => {
                n.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
            })
            node.parentNode?.nodeStatusUtils.clearStatusByType('NO_RESPONSE')
        }

        msg.payload[key] = newValue

        if (connection) {
            msg.hap.session = {
                sessionID: connection.sessionID,
                username: connection.username,
                remoteAddress: connection.remoteAddress,
                localAddress: connection.localAddress,
                httpPort: connection.remotePort,
            }
        }

        log.debug(
            `${node.name} received ${eventObject.name} ${key}: ${newValue}`
        )

        if (
            connection ||
            context ||
            node.hostNode.config.allowMessagePassthrough
        ) {
            node.send(msg)
        }
    }

    const onCharacteristicGet = (allCharacteristics: Characteristic[]) =>
        function (
            this: Characteristic,
            callback: CharacteristicGetCallback,
            _context: any,
            connection?: HAPConnection
        ) {
            if (isLegacyOutputMode()) {
                ServiceUtilsLegacy.onCharacteristicGet.call(
                    this,
                    callback,
                    _context,
                    connection
                )
                return
            }

            const oldValue = this.value

            const delayedCallback = (value?: any) => {
                const newValue = value ?? this.value
                if (callback) {
                    try {
                        callback(
                            (node.parentNode ?? node).reachable
                                ? null
                                : new HapStatusError(
                                      HAPStatus.SERVICE_COMMUNICATION_FAILURE
                                  ),
                            newValue
                        )
                    } catch (_) {}
                }

                output.call(
                    this,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.GET,
                        context: { key: this.displayName },
                    },
                    { oldValue, newValue },
                    connection
                )
            }

            if (node.config.useEventCallback) {
                const callbackID = Storage.saveCallback({
                    event: CharacteristicEventTypes.GET,
                    callback: delayedCallback,
                })

                log.debug(
                    `Registered callback ${callbackID} for Characteristic ${this.displayName}`
                )

                output.call(
                    this,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.GET,
                        context: { callbackID, key: this.displayName },
                    },
                    { oldValue },
                    connection
                )
            } else {
                delayedCallback()
            }
        }

    const onCharacteristicSet = (allCharacteristics: Characteristic[]) =>
        function (
            this: Characteristic,
            newValue: CharacteristicValue,
            callback: CharacteristicSetCallback,
            _context: any,
            connection?: HAPConnection
        ) {
            if (isLegacyOutputMode()) {
                ServiceUtilsLegacy.onCharacteristicSet(allCharacteristics).call(
                    this,
                    newValue,
                    callback,
                    _context,
                    connection
                )
                return
            }

            try {
                if (callback) {
                    callback(
                        (node.parentNode ?? node).reachable
                            ? null
                            : new HapStatusError(
                                  HAPStatus.SERVICE_COMMUNICATION_FAILURE
                              )
                    )
                }
            } catch (_) {}

            output.call(
                this,
                allCharacteristics,
                {
                    name: CharacteristicEventTypes.SET,
                    context: { key: this.displayName },
                },
                { newValue },
                connection
            )
        }

    const onCharacteristicChange = (allCharacteristics: Characteristic[]) =>
        function (this: Characteristic, change: CharacteristicChange) {
            if (isLegacyOutputMode()) {
                ServiceUtilsLegacy.onCharacteristicChange(
                    allCharacteristics
                ).call(this, change)
                return
            }

            const { oldValue, newValue, context, originator, reason } = change

            log.debug(
                `onCharacteristicChange with reason: ${reason}, oldValue: ${oldValue}, newValue: ${newValue}, context ${describeContext(context)} on connection ${originator?.sessionID}`
            )

            if (oldValue !== newValue) {
                output.call(
                    this,
                    allCharacteristics,
                    {
                        name: CharacteristicEventTypes.CHANGE,
                        context: { reason, key: this.displayName },
                    },
                    { oldValue, newValue, context },
                    originator
                )
            }
        }

    const onInput = (msg: HAPServiceMessage) => {
        if (msg.payload) {
            // payload must be an object
            const type = typeof msg.payload

            if (type !== 'object') {
                log.error(`Invalid payload type: ${type}`)
                return
            }
        } else {
            log.error('Invalid message (payload missing)')
            return
        }

        const topic = node.config.topic ?? node.name
        if (node.config.filter && msg.topic !== topic) {
            log.debug(
                "msg.topic doesn't match configured value and filter is enabled. Dropping message."
            )
            return
        }

        let context: any = null
        if (msg.payload.Context) {
            context = msg.payload.Context
            delete msg.payload.Context
        }

        node.topic_in = msg.topic ?? ''

        for (const key in msg.payload) {
            if (!Object.hasOwn(msg.payload, key)) {
                continue
            }

            if (!node.supported.has(key)) {
                if (
                    !isLegacyOutputMode() &&
                    node.config.useEventCallback &&
                    Storage.uuid4Validate(key)
                ) {
                    const callbackID = key
                    const callbackValue = msg.payload?.[key]
                    const eventCallback = Storage.loadCallback(callbackID)

                    if (eventCallback) {
                        log.debug(
                            `Calling ${eventCallback.event} callback ${callbackID}`
                        )
                        eventCallback.callback(callbackValue)
                    } else {
                        log.error(`Callback ${callbackID} timeout`)
                    }
                } else if (
                    key === 'AdaptiveLightingController' &&
                    node.adaptiveLightingController
                ) {
                    const value = msg.payload?.[key]
                    const event = value?.event

                    if (event === 'disable') {
                        node.adaptiveLightingController?.disableAdaptiveLighting()
                    }
                } else {
                    log.error(
                        `Instead of '${key}' try one of these characteristics: '${describeSupported(node.supported)}'`
                    )
                }
            } else {
                const value = msg.payload?.[key]
                const normalizedValue =
                    value === NO_RESPONSE_MSG ? false : value

                const parentNode = node.parentNode ?? node
                parentNode.reachable = value !== NO_RESPONSE_MSG

                const characteristic = node.service.getCharacteristic(
                    Characteristic[key]
                )

                if (context !== null) {
                    characteristic.setValue(normalizedValue, context)
                } else {
                    characteristic.setValue(normalizedValue)
                }
            }
        }
    }

    const onClose = (removed: boolean, done: () => void) => {
        node.nrchkbClosing = true

        if (node.waitForParentTimer) {
            clearTimeout(node.waitForParentTimer)
            node.waitForParentTimer = undefined
        }

        Object.values(node.publishTimers).forEach((timer) => {
            clearTimeout(timer)
        })
        node.publishTimers = {}

        const characteristics = node.service
            ? node.service.characteristics.concat(
                  node.service.optionalCharacteristics
              )
            : []

        characteristics.forEach((characteristic) => {
            // cleanup all node specific listeners
            characteristic.removeListener('get', node.onCharacteristicGet)
            characteristic.removeListener('set', node.onCharacteristicSet)
            characteristic.removeListener('change', node.onCharacteristicChange)
        })

        if (node.config.isParent && node.accessory && node.onIdentify) {
            // remove identify listener to prevent errors with undefined values
            node.accessory.removeListener('identify', node.onIdentify)
        }

        if (removed && node.accessory) {
            // This node has been deleted
            if (node.config.isParent) {
                // remove accessory from the bridge
                node.hostNode.host.removeBridgedAccessories([node.accessory])
                node.accessory.destroy()
            } else if (node.service && node.parentService) {
                // only remove the service if it is not a parent
                node.accessory.removeService(node.service)
                node.parentService.removeLinkedService(node.service)
            }
        }

        // Clean up any pending status timeouts
        node.nodeStatusUtils.cleanup()

        done()
    }

    const getOrCreate = async (
        accessory: Accessory,
        serviceInformation: {
            name: string
            UUID: string
            serviceName: string
            config: HAPService2ConfigType
        },
        parentService: Service
    ): Promise<Service> => {
        type NRCHKBPluginInstanceNode = {
            id?: string
            type?: string
            attachNRCHKBPlugin?: (context: {
                accessory: Accessory
                config: unknown
                node?: {
                    on: (
                        event: 'close',
                        handler: (removed: boolean) => void
                    ) => void
                }
                RED?: {
                    nodes: {
                        getNode: (id: string) => unknown
                    }
                }
                serviceInformation: {
                    name: string
                    UUID: string
                    serviceName: string
                    config: Record<string, unknown>
                }
            }) => Service | Promise<Service>
        }

        const createAttachContext = (config: unknown) => ({
            accessory,
            config,
            node,
            RED: node.RED,
            serviceInformation: {
                name: serviceInformation.name,
                UUID: serviceInformation.UUID,
                serviceName: serviceInformation.serviceName,
                config: serviceInformation.config as unknown as Record<
                    string,
                    unknown
                >,
            },
        })

        let pluginService: Service | undefined = undefined
        const pluginSlots = [
            serviceInformation.config.plugin1,
            serviceInformation.config.plugin2,
            serviceInformation.config.plugin3,
            serviceInformation.config.plugin4,
            serviceInformation.config.plugin5,
            serviceInformation.config.plugin6,
            serviceInformation.config.plugin7,
            serviceInformation.config.plugin8,
        ].filter(
            (pluginNodeId): pluginNodeId is string =>
                typeof pluginNodeId === 'string' && pluginNodeId.trim() !== ''
        )

        for (const pluginNodeId of pluginSlots) {
            const pluginNode = node.RED.nodes.getNode(pluginNodeId) as
                | NRCHKBPluginInstanceNode
                | undefined

            if (!pluginNode) {
                throw new NRCHKBError(
                    `Plugin config node "${pluginNodeId}" was not found.`
                )
            }

            if (typeof pluginNode.attachNRCHKBPlugin !== 'function') {
                throw new NRCHKBError(
                    `Config node "${pluginNodeId}" is not an NRCHKB plugin instance.`
                )
            }

            const attachedService = await pluginNode.attachNRCHKBPlugin(
                createAttachContext({})
            )
            pluginService ??= attachedService
        }

        const pluginEntries = parsePluginEntries(
            serviceInformation.config.plugins,
            log
        )

        if (pluginEntries.length) {
            const plugins = pluginEntries

            for (const pluginConfig of plugins) {
                const pluginDefinition = getPlugin(pluginConfig.id)
                if (!pluginDefinition) {
                    throw new NRCHKBError(
                        `Camera plugin "${pluginConfig.id}" is not registered.`
                    )
                }

                const attachedService = await pluginDefinition.factory.attach({
                    ...createAttachContext(pluginConfig.config),
                })
                pluginService ??= attachedService
            }
        }

        if (pluginService) {
            return pluginService
        }

        const serviceName =
            serviceInformation.serviceName === 'Camera'
                ? 'CameraRTPStreamManagement'
                : serviceInformation.serviceName

        const ServiceConstructor = Service[serviceName]

        if (typeof ServiceConstructor !== 'function') {
            throw new NRCHKBError(
                `Unknown HomeKit service "${serviceInformation.serviceName}".`
            )
        }

        const newService = new ServiceConstructor(
            serviceInformation.name,
            serviceInformation.UUID
        )
        log.debug(
            `Looking for service with UUID ${serviceInformation.UUID} ...`
        )

        // search for a service with the same subtype
        let service: Service | undefined = accessory.services.find(
            (service) => {
                return newService.subtype === service.subtype
            }
        )

        if (service && newService.UUID !== service.UUID) {
            // if the UUID and therefore the type changed, the whole service
            // will be replaced
            log.debug('... service type changed! Removing the old service.')
            accessory.removeService(service)
            service = undefined
        }

        if (!service) {
            // if no matching service was found or the type changed, then a new
            // service will be added
            log.debug(
                `... didn't find it. Adding new ${serviceInformation.serviceName} service.`
            )

            service = accessory.addService(newService)
        } else {
            // if a service with the same UUID and subtype was found, it will
            // be updated and used
            log.debug('... found it! Updating it.')
            service
                .getCharacteristic(Characteristic.Name)
                .setValue(serviceInformation.name)
        }

        if (parentService) {
            if (service) {
                log.debug('... and linking service to parent.')
                parentService.addLinkedService(service)
            }
        }

        return service ?? newService
    }

    const waitForParent = () => {
        log.debug('Waiting for Parent Service')

        return new Promise((resolve) => {
            node.nodeStatusUtils.setStatus({
                fill: 'blue',
                shape: 'dot',
                text: 'Waiting for Parent Service',
            })

            const checkAndWait = () => {
                const parentNode: HAPService2NodeType = node.RED.nodes.getNode(
                    node.config.parentService
                ) as HAPService2NodeType

                if (parentNode?.configured) {
                    node.waitForParentTimer = undefined
                    resolve(parentNode)
                } else {
                    node.waitForParentTimer = setTimeout(checkAndWait, 1000)
                }
            }
            checkAndWait()
        }).catch((error) => {
            log.error(`Waiting for Parent Service failed due to: ${error}`)
            throw new NRCHKBError(error)
        })
    }

    const handleWaitForSetup = (
        config: HAPService2ConfigType,
        msg: Record<string, any>,
        resolve: (newConfig: HAPService2ConfigType) => void
    ) => {
        if (node.setupDone) {
            return
        }

        if (
            msg &&
            Object.hasOwn(msg, 'payload') &&
            msg.payload &&
            typeof msg.payload === 'object' &&
            Object.hasOwn(msg.payload, 'nrchkb') &&
            msg.payload.nrchkb &&
            typeof msg.payload.nrchkb === 'object' &&
            Object.hasOwn(msg.payload.nrchkb, 'setup')
        ) {
            node.setupDone = true

            const newConfig = {
                ...config,
                ...msg.payload.nrchkb.setup,
            }

            node.removeListener('input', node.handleWaitForSetup)

            resolve(newConfig)
        } else {
            log.error(
                'Invalid message (required {"payload":{"nrchkb":{"setup":{}}}})'
            )
        }
    }

    return {
        getOrCreate,
        onCharacteristicGet,
        onCharacteristicSet,
        onCharacteristicChange,
        onInput,
        onClose,
        waitForParent,
        handleWaitForSetup,
        configureAdaptiveLightning:
            ServiceUtilsLegacy.configureAdaptiveLightning,
    }
}

export = buildServiceUtils2
