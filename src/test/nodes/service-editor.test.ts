import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

type RegisteredNode = {
    oneditsave: (this: Record<string, unknown>) => boolean | void
}

const loadEditorDefinition = (filename: string, nodeType: string) => {
    const html = readFileSync(resolve(process.cwd(), filename), 'utf8')
    const scripts = [
        ...html.matchAll(
            /<script type="text\/javascript">([\s\S]*?)<\/script>/g
        ),
    ]
        .map((match) => match[1])
        .join('\n')
    const registeredNodes: Record<string, RegisteredNode> = {}
    let editorValues: Record<
        string,
        { attr?: Record<string, string>; val: string }
    > = {}
    const jqueryStub = (selector: string) => ({
        addClass: () => jqueryStub(selector),
        attr: (name: string) => editorValues[selector]?.attr?.[name],
        hide: () => jqueryStub(selector),
        remove: () => jqueryStub(selector),
        val: (value?: string) => {
            if (value !== undefined) {
                editorValues[selector] = {
                    ...(editorValues[selector] ?? {}),
                    val: value,
                }
                return jqueryStub(selector)
            }

            return editorValues[selector]?.val ?? ''
        },
    })

    const context = vm.createContext({
        $: jqueryStub,
        RED: {
            nodes: {
                getType: (type: string) => registeredNodes[type],
                registerType: (type: string, definition: RegisteredNode) => {
                    registeredNodes[type] = definition
                },
                registry: {
                    getNodeTypes: () => Object.keys(registeredNodes),
                },
            },
            validators: {
                number: () => () => true,
            },
        },
        cameraConfigRequiredField: () => true,
        isValueDefined: (value: unknown) =>
            value !== undefined && value !== null,
        nrchkbVersion: 'test',
        setTimeout: () => undefined,
        versionValidator: () => true,
    })

    vm.runInContext(scripts, context)

    return {
        definition: registeredNodes[nodeType],
        setEditorValues: (
            values: Record<
                string,
                { attr?: Record<string, string>; val: string }
            >
        ) => {
            editorValues = values
        },
        getEditorValue: (selector: string) => editorValues[selector]?.val,
    }
}

describe('service node editor', () => {
    it.each([
        ['build/nodes/service.html', 'homekit-service'],
        ['build/nodes/service2.html', 'homekit-service2'],
    ])('clears stale bridge and accessory values when saving a linked %s service', (filename, nodeType) => {
        const { definition, getEditorValue, setEditorValues } =
            loadEditorDefinition(filename, nodeType)
        const node = {
            accessoryId: 'old-accessory',
            bridge: 'old-bridge',
            hostType: '0',
            isParent: true,
            parentService: '',
            serviceName: 'Switch',
        }

        setEditorValues({
            '#node-config-input-isParent': { val: 'false' },
            '#node-config-input-hostType': { val: '0' },
            '#node-input-accessoryId': { val: 'old-accessory' },
            '#node-input-bridge': { val: 'old-bridge' },
            '#node-input-parentService option:selected': {
                attr: { hostType: '0' },
                val: 'parent-service',
            },
            '#node-input-serviceName option:selected': { val: 'Lightbulb' },
        })

        definition.oneditsave.call(node)

        expect(node).toMatchObject({
            accessoryId: '',
            bridge: '',
            hostType: '0',
            isParent: false,
            parentService: 'parent-service',
            serviceName: 'Lightbulb',
        })
        expect(getEditorValue('#node-input-accessoryId')).toBe('')
        expect(getEditorValue('#node-input-bridge')).toBe('')
    })
})
