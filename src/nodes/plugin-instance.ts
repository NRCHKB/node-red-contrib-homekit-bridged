import type { Service } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type { NodeAPI, NodeDef } from 'node-red'

import type { NRCHKBPluginAttachContext } from '../plugins/registry'
import { getPlugin } from '../plugins/registry'

const log = logger('NRCHKB', 'PluginInstance')

type PluginInstanceNode = NodeDef & {
    pluginId?: string
    pluginConfig?: string
    controller?: string
    attachNRCHKBPlugin: (
        context: NRCHKBPluginAttachContext
    ) => Service | Promise<Service>
}

const parseConfig = (value: unknown): Record<string, unknown> => {
    if (typeof value !== 'string' || value.trim() === '') {
        return {}
    }

    try {
        const parsed = JSON.parse(value) as unknown
        return parsed && typeof parsed === 'object'
            ? (parsed as Record<string, unknown>)
            : {}
    } catch (_) {
        return {}
    }
}

const getConfig = (node: PluginInstanceNode): Record<string, unknown> => {
    const config = parseConfig(node.pluginConfig)

    if (node.controller && typeof config.controller !== 'string') {
        config.controller = node.controller
    }

    return config
}

module.exports = (RED: NodeAPI) => {
    const init = function (
        this: PluginInstanceNode,
        config: PluginInstanceNode
    ) {
        RED.nodes.createNode(this, config)
        Object.assign(this, config)

        this.attachNRCHKBPlugin = (context) => {
            const pluginId = this.pluginId

            if (!pluginId) {
                throw new Error('NRCHKB plugin instance has no plugin id.')
            }

            const plugin = getPlugin(pluginId)

            if (!plugin) {
                throw new Error(
                    `NRCHKB plugin "${pluginId}" is not registered.`
                )
            }

            return plugin.factory.attach({
                ...context,
                config: getConfig(this),
            })
        }
    }

    log.debug('Registering homekit-plugin-instance type')
    RED.nodes.registerType('homekit-plugin-instance', init)
}
