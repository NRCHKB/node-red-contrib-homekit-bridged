import { afterEach, describe, expect, it } from 'vitest'
import {
    clearPluginsForTest,
    listPlugins,
    NRCHKB_NODE_RED_PLUGIN_TYPE,
    normalizePluginId,
    registerNodeRedPlugins,
    registerPlugin,
    registerPluginFromPackage,
} from '../../plugins/registry'

const factory = {
    attach: () => {
        throw new Error('not used')
    },
}

const metadata = {
    id: 'example-package:camera',
    packageName: 'example-package',
    pluginName: 'camera',
    displayName: 'Camera',
    author: 'Example',
    version: '1.0.0',
    description: 'Example camera plugin.',
    capabilities: {
        camera: true,
    },
}

describe('plugin registry', () => {
    afterEach(() => {
        clearPluginsForTest()
    })

    it('normalizes plugin ids from package and plugin names', () => {
        expect(normalizePluginId('@awesome/some-plugin', 'camera')).toBe(
            '@awesome/some-plugin:camera'
        )
    })

    it('rejects duplicate ids', () => {
        registerPlugin(metadata, factory)

        expect(() => registerPlugin(metadata, factory)).toThrow(
            'already registered'
        )
    })

    it('allows duplicate display names from different packages', () => {
        registerPlugin(metadata, factory)
        registerPlugin(
            {
                ...metadata,
                id: 'other-package:camera',
                packageName: 'other-package',
            },
            factory
        )

        expect(listPlugins()).toHaveLength(2)
    })

    it('fills package identity from package json', () => {
        const plugin = registerPluginFromPackage(
            {
                name: '@awesome/some-plugin',
                version: '2.3.4',
            },
            {
                pluginName: 'camera',
                displayName: 'Camera',
                author: 'Awesome',
                description: 'Adds a camera.',
                capabilities: {
                    camera: true,
                },
            },
            factory
        )

        expect(plugin.metadata).toMatchObject({
            id: '@awesome/some-plugin:camera',
            packageName: '@awesome/some-plugin',
            version: '2.3.4',
        })
    })

    it('accepts plugin prerequisites and single-instance metadata', () => {
        const plugin = registerPlugin(
            {
                ...metadata,
                attachment: 'inline',
                prerequisites: {
                    serviceNames: ['Camera'],
                },
                serviceNames: ['Camera'],
                multipleInstances: false,
            },
            factory
        )

        expect(plugin.metadata.prerequisites?.serviceNames).toEqual(['Camera'])
        expect(plugin.metadata.serviceNames).toEqual(['Camera'])
        expect(plugin.metadata.attachment).toBe('inline')
        expect(plugin.metadata.multipleInstances).toBe(false)
    })

    it('accepts config-node plugin metadata', () => {
        const plugin = registerPlugin(
            {
                ...metadata,
                attachment: 'config-node',
            },
            factory
        )

        expect(plugin.metadata.attachment).toBe('config-node')
    })

    it('registers Node-RED NRCHKB plugin definitions', () => {
        registerNodeRedPlugins({
            plugins: {
                getPluginsByType: (type) =>
                    type === NRCHKB_NODE_RED_PLUGIN_TYPE
                        ? [
                              {
                                  type: NRCHKB_NODE_RED_PLUGIN_TYPE,
                                  metadata,
                                  factory,
                              },
                          ]
                        : [],
            },
        })

        expect(listPlugins()).toHaveLength(1)
        expect(listPlugins()[0].metadata.id).toBe(metadata.id)
    })

    it('skips invalid Node-RED plugin definitions without blocking valid plugins', () => {
        const warnings: string[] = []
        const validMetadata = {
            ...metadata,
            id: 'valid-package:camera',
            packageName: 'valid-package',
        }

        registerNodeRedPlugins({
            log: {
                warn: (message) => warnings.push(message),
            },
            plugins: {
                getPluginsByType: (type) =>
                    type === NRCHKB_NODE_RED_PLUGIN_TYPE
                        ? [
                              {
                                  type: NRCHKB_NODE_RED_PLUGIN_TYPE,
                                  metadata: {
                                      ...metadata,
                                      id: 'broken-package:camera',
                                      packageName: 'valid-package',
                                  },
                                  factory,
                              },
                              {
                                  type: NRCHKB_NODE_RED_PLUGIN_TYPE,
                                  metadata: validMetadata,
                                  factory,
                              },
                          ]
                        : [],
            },
        })

        expect(listPlugins()).toHaveLength(1)
        expect(listPlugins()[0].metadata.id).toBe(validMetadata.id)
        expect(warnings[0]).toContain('broken-package:camera')
    })

    it('rejects invalid service prerequisites', () => {
        expect(() =>
            registerPlugin(
                {
                    ...metadata,
                    prerequisites: {
                        serviceNames: ['Camera', ''],
                    },
                },
                factory
            )
        ).toThrow('prerequisites.serviceNames')
    })

    it('accepts serializable plugin editor metadata', () => {
        const plugin = registerPlugin(
            {
                ...metadata,
                editor: {
                    defaultConfig: {
                        enabled: true,
                    },
                    sections: [
                        {
                            title: 'Settings',
                            icon: 'fa-sliders',
                            collapsed: true,
                            fields: [
                                {
                                    path: 'enabled',
                                    label: 'Enabled',
                                    type: 'checkbox',
                                },
                                {
                                    path: 'controller',
                                    label: 'Controller',
                                    type: 'config-node',
                                    configNodeType: 'homekit-unifi-controller',
                                },
                                {
                                    path: 'camera',
                                    label: 'Camera',
                                    type: 'dynamic-select',
                                    optionsUrl:
                                        'nrchkb/unifi/controllers/{controller}/protect/cameras',
                                    optionsDependsOn: 'controller',
                                },
                            ],
                        },
                    ],
                },
            },
            factory
        )

        expect(plugin.metadata.editor?.sections[0].fields[0]).toMatchObject({
            path: 'enabled',
            label: 'Enabled',
            type: 'checkbox',
        })
        expect(plugin.metadata.editor?.sections[0]).toMatchObject({
            title: 'Settings',
            icon: 'fa-sliders',
            collapsed: true,
        })
        expect(plugin.metadata.editor?.sections[0].fields[1]).toMatchObject({
            path: 'controller',
            type: 'config-node',
        })
    })

    it('rejects invalid plugin editor metadata', () => {
        expect(() =>
            registerPlugin(
                {
                    ...metadata,
                    editor: {
                        sections: [
                            {
                                fields: [
                                    {
                                        path: '',
                                        label: 'Broken',
                                        type: 'text',
                                    },
                                ],
                            },
                        ],
                    },
                },
                factory
            )
        ).toThrow('editor.sections')
    })
})
