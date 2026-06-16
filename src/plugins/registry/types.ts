import type { Accessory, Service } from '@homebridge/hap-nodejs'

export type NRCHKBPluginCapabilities = {
    camera?: boolean
    snapshots?: boolean
    liveVideo?: boolean
    audio?: boolean
    twoWayAudio?: boolean
    secureVideo?: boolean
    experimental?: string[]
}

export type NRCHKBPluginPrerequisites = {
    serviceNames?: string[]
}

export type NRCHKBPluginUpstreamMetadata = {
    packageName: string
    packageVersion?: string
    projectName?: string
    repoUrl?: string
    license?: string
    authors?: string[]
    contributors?: string[]
    disclaimer?: string
}

export type NRCHKBPluginEditorFieldOption = {
    value: string
    label: string
}

export type NRCHKBPluginEditorField = {
    path: string
    label: string
    type:
        | 'text'
        | 'number'
        | 'checkbox'
        | 'select'
        | 'password'
        | 'textarea'
        | 'config-node'
        | 'dynamic-select'
    icon?: string
    placeholder?: string
    default?: string | number | boolean
    options?: NRCHKBPluginEditorFieldOption[]
    configNodeType?: string
    optionsUrl?: string
    optionsDependsOn?: string
}

export type NRCHKBPluginEditorSection = {
    title?: string
    description?: string
    icon?: string
    collapsed?: boolean
    fields: NRCHKBPluginEditorField[]
}

export type NRCHKBPluginEditorMetadata = {
    defaultConfig?: Record<string, unknown>
    sections: NRCHKBPluginEditorSection[]
}

export type NRCHKBPluginMetadata = {
    id: string
    packageName: string
    pluginName: string
    displayName: string
    author: string
    version: string
    description: string
    attachment?: 'inline' | 'config-node'
    capabilities: NRCHKBPluginCapabilities
    prerequisites?: NRCHKBPluginPrerequisites
    serviceNames?: string[]
    multipleInstances?: boolean
    license?: string
    upstream?: NRCHKBPluginUpstreamMetadata
    editor?: NRCHKBPluginEditorMetadata
}

export type NRCHKBPluginConfigEntry<TConfig = unknown> = {
    id: string
    config?: TConfig
    automatic?: boolean
    modified?: boolean
}

export type NRCHKBPluginAttachContext<TConfig = unknown> = {
    accessory: Accessory
    config: TConfig
    node?: {
        on: (event: 'close', handler: (removed: boolean) => void) => void
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
}

export type NRCHKBPluginFactory<TConfig = unknown> = {
    attach: (
        context: NRCHKBPluginAttachContext<TConfig>
    ) => Service | Promise<Service>
}

export type NRCHKBRegisteredPlugin<TConfig = unknown> = {
    metadata: NRCHKBPluginMetadata
    factory: NRCHKBPluginFactory<TConfig>
}

export type NRCHKBNodeRedPluginDefinition<TConfig = unknown> = {
    type: 'nrchkb-homekit-plugin'
    metadata: NRCHKBPluginMetadata
    factory?: NRCHKBPluginFactory<TConfig>
}
