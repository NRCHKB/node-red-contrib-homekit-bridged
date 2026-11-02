import type { Service } from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type { Node, NodeAPI, NodeConstructor, NodeDef } from 'node-red'
import type { NRCHKBLogLevel } from '../lib/utils/LogUtils'
import { scopedLogger } from '../lib/utils/LogUtils'
import type { NRCHKBPluginAttachContext } from '../plugins/registry'
import { getPlugin } from '../plugins/registry'

const log = logger('NRCHKB', 'PluginInstance')

type PluginInstanceConfig = NodeDef & {
    pluginId?: string
    pluginConfig?: string
    controller?: string
    logLevel?: NRCHKBLogLevel
    attachNRCHKBPlugin: (
        context: NRCHKBPluginAttachContext
    ) => Service | Promise<Service>
}

type PluginInstanceNode = Node & PluginInstanceConfig

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

const getConfig = (node: PluginInstanceConfig): Record<string, unknown> => {
    const config = parseConfig(node.pluginConfig)

    if (node.controller && typeof config.controller !== 'string') {
        config.controller = node.controller
    }

    return config
}

module.exports = (RED: NodeAPI) => {
    const init: NodeConstructor<
        Node,
        PluginInstanceConfig,
        Record<never, never>
    > = function (config) {
        RED.nodes.createNode(this, config)
        const node = this as PluginInstanceNode
        Object.assign(node, config)
        const nodeLog = scopedLogger(
            'NRCHKB',
            'PluginInstance',
            node.name,
            node
        )

        node.attachNRCHKBPlugin = (context) => {
            const pluginId = node.pluginId

            if (!pluginId) {
                nodeLog.error('NRCHKB plugin instance has no plugin id.', false)
                throw new Error('NRCHKB plugin instance has no plugin id.')
            }

            const plugin = getPlugin(pluginId)

            if (!plugin) {
                nodeLog.error(
                    `NRCHKB plugin "${pluginId}" is not registered.`,
                    false
                )
                throw new Error(
                    `NRCHKB plugin "${pluginId}" is not registered.`
                )
            }

            return plugin.factory.attach({
                ...context,
                config: getConfig(node),
            })
        }
    }

    log.debug('Registering homekit-plugin-instance type')
    RED.nodes.registerType('homekit-plugin-instance', init)
}
