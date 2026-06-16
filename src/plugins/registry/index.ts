import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
    NRCHKBNodeRedPluginDefinition,
    NRCHKBPluginFactory,
    NRCHKBPluginMetadata,
    NRCHKBRegisteredPlugin,
} from './types'

export const NRCHKB_NODE_RED_PLUGIN_TYPE = 'nrchkb-homekit-plugin'

const registry = new Map<string, NRCHKBRegisteredPlugin>()

export const normalizePluginId = (
    packageName: string,
    pluginName: string
): string => `${packageName}:${pluginName}`

const assertNonEmpty = (field: string, value: unknown): void => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Plugin metadata field "${field}" is required.`)
    }
}

export const validatePluginMetadata = (
    metadata: NRCHKBPluginMetadata
): NRCHKBPluginMetadata => {
    assertNonEmpty('packageName', metadata.packageName)
    assertNonEmpty('pluginName', metadata.pluginName)
    assertNonEmpty('displayName', metadata.displayName)
    assertNonEmpty('author', metadata.author)
    assertNonEmpty('version', metadata.version)
    assertNonEmpty('description', metadata.description)

    if (!metadata.capabilities || typeof metadata.capabilities !== 'object') {
        throw new Error('Plugin metadata field "capabilities" is required.')
    }

    if (
        metadata.prerequisites?.serviceNames &&
        (!Array.isArray(metadata.prerequisites.serviceNames) ||
            metadata.prerequisites.serviceNames.some(
                (serviceName) =>
                    typeof serviceName !== 'string' ||
                    serviceName.trim().length === 0
            ))
    ) {
        throw new Error(
            'Plugin metadata prerequisites.serviceNames must be an array of service names.'
        )
    }

    if (metadata.serviceNames) {
        if (
            !Array.isArray(metadata.serviceNames) ||
            metadata.serviceNames.some(
                (serviceName) =>
                    typeof serviceName !== 'string' ||
                    serviceName.trim().length === 0
            )
        ) {
            throw new Error(
                'Plugin metadata serviceNames must be an array of service names.'
            )
        }
    }

    if (
        metadata.attachment &&
        !['inline', 'config-node'].includes(metadata.attachment)
    ) {
        throw new Error(
            'Plugin metadata attachment must be "inline" or "config-node".'
        )
    }

    if (
        metadata.editor &&
        (!Array.isArray(metadata.editor.sections) ||
            metadata.editor.sections.some(
                (section) =>
                    (section.title !== undefined &&
                        typeof section.title !== 'string') ||
                    (section.description !== undefined &&
                        typeof section.description !== 'string') ||
                    (section.icon !== undefined &&
                        typeof section.icon !== 'string') ||
                    (section.collapsed !== undefined &&
                        typeof section.collapsed !== 'boolean') ||
                    !Array.isArray(section.fields) ||
                    section.fields.some(
                        (field) =>
                            typeof field.path !== 'string' ||
                            field.path.trim().length === 0 ||
                            typeof field.label !== 'string' ||
                            field.label.trim().length === 0 ||
                            ![
                                'text',
                                'number',
                                'checkbox',
                                'select',
                                'password',
                                'textarea',
                                'config-node',
                                'dynamic-select',
                            ].includes(field.type)
                    )
            ))
    ) {
        throw new Error(
            'Plugin metadata editor.sections must contain valid editor field definitions.'
        )
    }

    const expectedId = normalizePluginId(
        metadata.packageName,
        metadata.pluginName
    )
    if (metadata.id !== expectedId) {
        throw new Error(
            `Plugin id "${metadata.id}" must match normalized id "${expectedId}".`
        )
    }

    return {
        ...metadata,
        attachment: metadata.attachment ?? 'inline',
    }
}

export const registerPlugin = <TConfig>(
    metadata: NRCHKBPluginMetadata,
    factory: NRCHKBPluginFactory<TConfig>
): NRCHKBRegisteredPlugin<TConfig> => {
    const validMetadata = validatePluginMetadata(metadata)

    if (registry.has(validMetadata.id)) {
        throw new Error(`Plugin "${validMetadata.id}" is already registered.`)
    }

    const plugin = {
        metadata: validMetadata,
        factory,
    }

    registry.set(validMetadata.id, plugin as NRCHKBRegisteredPlugin)

    return plugin
}

type PackageJsonLike = {
    name?: string
    version?: string
}

export const registerPluginFromPackage = <TConfig>(
    packageJson: PackageJsonLike,
    metadata: Omit<NRCHKBPluginMetadata, 'packageName' | 'version' | 'id'> &
        Partial<Pick<NRCHKBPluginMetadata, 'packageName' | 'version' | 'id'>>,
    factory: NRCHKBPluginFactory<TConfig>
): NRCHKBRegisteredPlugin<TConfig> => {
    const packageName = metadata.packageName ?? packageJson.name
    const version = metadata.version ?? packageJson.version

    if (!packageName) {
        throw new Error('Plugin packageName could not be resolved.')
    }

    if (!version) {
        throw new Error('Plugin version could not be resolved.')
    }

    return registerPlugin(
        {
            ...metadata,
            packageName,
            version,
            id:
                metadata.id ??
                normalizePluginId(packageName, metadata.pluginName),
        },
        factory
    )
}

const findNearestPackageJson = (startFile: string): PackageJsonLike => {
    let current = path.dirname(startFile)

    while (current !== path.dirname(current)) {
        const candidate = path.join(current, 'package.json')
        if (fs.existsSync(candidate)) {
            return JSON.parse(fs.readFileSync(candidate, 'utf8'))
        }

        current = path.dirname(current)
    }

    throw new Error(`Could not find package.json for ${startFile}.`)
}

export const registerPluginFromModule = <TConfig>(
    importMetaUrl: string,
    metadata: Omit<NRCHKBPluginMetadata, 'packageName' | 'version' | 'id'> &
        Partial<Pick<NRCHKBPluginMetadata, 'packageName' | 'version' | 'id'>>,
    factory: NRCHKBPluginFactory<TConfig>
): NRCHKBRegisteredPlugin<TConfig> => {
    const modulePath = fileURLToPath(importMetaUrl)
    const packageJson = findNearestPackageJson(modulePath)

    if (metadata.packageName && metadata.packageName !== packageJson.name) {
        throw new Error(
            `Plugin packageName "${metadata.packageName}" does not match nearest package "${packageJson.name}".`
        )
    }

    return registerPluginFromPackage(packageJson, metadata, factory)
}

export const getPlugin = (id: string): NRCHKBRegisteredPlugin | undefined =>
    registry.get(id)

export const listPlugins = (): NRCHKBRegisteredPlugin[] =>
    Array.from(registry.values())

export const registerNodeRedPlugins = (RED?: {
    log?: {
        warn?: (message: string) => void
    }
    plugins?: {
        getPluginsByType?: (
            type: string
        ) => Array<NRCHKBNodeRedPluginDefinition>
    }
}): void => {
    const nodeRedPlugins = RED?.plugins?.getPluginsByType?.(
        NRCHKB_NODE_RED_PLUGIN_TYPE
    )

    nodeRedPlugins?.forEach((definition) => {
        if (
            definition.type !== NRCHKB_NODE_RED_PLUGIN_TYPE ||
            !definition.metadata ||
            !definition.factory ||
            registry.has(definition.metadata.id)
        ) {
            return
        }

        try {
            registerPlugin(definition.metadata, definition.factory)
        } catch (error) {
            RED?.log?.warn?.(
                `Skipping NRCHKB plugin "${definition.metadata.id}" because registration failed: ${error}`
            )
        }
    })
}

export const clearPluginsForTest = (): void => {
    registry.clear()
}

export type {
    NRCHKBNodeRedPluginDefinition,
    NRCHKBPluginAttachContext,
    NRCHKBPluginConfigEntry,
    NRCHKBPluginEditorField,
    NRCHKBPluginEditorFieldOption,
    NRCHKBPluginEditorMetadata,
    NRCHKBPluginEditorSection,
    NRCHKBPluginFactory,
    NRCHKBPluginMetadata,
    NRCHKBPluginPrerequisites,
    NRCHKBPluginUpstreamMetadata,
    NRCHKBRegisteredPlugin,
} from './types'
