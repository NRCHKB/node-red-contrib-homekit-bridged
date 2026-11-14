import { Characteristic, HAPStatus } from '@homebridge/hap-nodejs'
import { describe, expect, it, vi } from 'vitest'
import { helper, type TestFlowNode } from './vitest-helper'

type FlowBuilderResult = {
    flow: TestFlowNode[]
    serviceId: string
}
type CommonSwitchServiceOptions = {
    buildFlow: () => FlowBuilderResult
    expectedType: 'homekit-service' | 'homekit-service2'
    nodes: unknown[]
    title: string
}

// Node-RED queues downstream delivery with setImmediate. Drain the HAP promise
// continuation and that queue before checking exact (including zero) counts.
export const drainMessages = async () => {
    await new Promise<void>((resolve) => setImmediate(resolve))
    await new Promise<void>((resolve) => setImmediate(resolve))
}

export function describeCommonSwitchServiceBehavior({
    buildFlow,
    expectedType,
    nodes,
    title,
}: CommonSwitchServiceOptions) {
    const eventMode = expectedType === 'homekit-service2'
    const load = async (
        configure?: (flow: TestFlowNode[]) => void,
        existing = buildFlow()
    ) => {
        configure?.(existing.flow)
        await helper.load(nodes as never, existing.flow)
        const node = helper.getNode(existing.serviceId) as any
        await vi.waitFor(() => expect(node.service).toBeDefined(), {
            timeout: 3000,
            interval: 10,
        })
        const ports: any[][] = [[], []]
        helper.getNode('h1').on('input', (msg) => ports[0].push(msg))
        helper.getNode('h2').on('input', (msg) => ports[1].push(msg))
        const on = node.service.getCharacteristic(Characteristic.On)
        return { node, on, ports }
    }
    const counts = (ports: any[][], change: number, set: number) => {
        expect(ports.map((port) => port.length)).toEqual(
            eventMode ? [change + set, 0] : [change, set]
        )
    }

    describe(expectedType + ': ' + title, () => {
        it.each(['bridge', 'standalone'])(
            'preserves template identity when initializing a subflow service on %s',
            async (host) => {
                const existing = buildFlow()
                const config = existing.flow.find(
                    (item) => item.id === existing.serviceId
                )!
                config.waitForSetupMsg = true
                if (host === 'standalone') {
                    const bridge = existing.flow.find(
                        (item) => item.type === 'homekit-bridge'
                    )!
                    bridge.type = 'homekit-standalone'
                    config.hostType = '1'
                    config.accessoryId = bridge.id
                    config.bridge = ''
                }
                await helper.load(
                    [
                        ...nodes,
                        require('../../../build/nodes/standalone'),
                    ] as never,
                    existing.flow
                )
                const node = helper.getNode(existing.serviceId) as any
                // Supply the metadata Node-RED attaches to a subflow instance before setup.
                node._alias = 'template-service'
                node._flow = Object.assign(Object.create(node._flow), {
                    TYPE: 'subflow',
                    path: 'flow/instance',
                })
                node.receive({ payload: { nrchkb: { setup: {} } } })
                await vi.waitFor(() => expect(node.configured).toBe(true), {
                    timeout: 1000,
                })
                expect(node.uniqueIdentifier).toBe(
                    'template-service/flow/instance'
                )
                node.receive({ payload: { On: true } })
                await drainMessages()
                expect(
                    node.service.getCharacteristic(Characteristic.On).value
                ).toBe(true)
            }
        )
        it('loads a real HAP Switch', async () => {
            const { node, on } = await load()
            expect(node.type).toBe(expectedType)
            expect(on).toBeInstanceOf(Characteristic.On)
        })

        it.each([true, false])(
            'input updates HAP and routes On:%s',
            async (value) => {
                const { node, on, ports } = await load()
                on.value = !value
                node.receive({ payload: { On: value }, topic: 'incoming' })
                await drainMessages()
                expect(on.value).toBe(value)
                counts(ports, 1, 1)
                const change = ports[0][0]
                const set = ports[eventMode ? 0 : 1][eventMode ? 1 : 0]
                expect(change).toMatchObject({
                    payload: { On: value },
                    name: node.name,
                    topic: 'incoming',
                    hap: {
                        oldValue: !value,
                        newValue: value,
                        reachable: true,
                        allChars: { On: value },
                    },
                })
                expect(set).toMatchObject({
                    payload: { On: value },
                    hap: { newValue: value, reachable: true },
                })
                if (eventMode) {
                    expect(set.hap.event.name).toBe('set')
                    expect(change.hap.event.name).toBe('change')
                }
            }
        )

        it('real HAP writes complete; repeated sets emit but unchanged values do not emit changes', async () => {
            const { on, ports } = await load()
            await expect(on.handleSetRequest(true)).resolves.toBeUndefined()
            await drainMessages()
            expect(on.value).toBe(true)
            counts(ports, 1, 1)
            await expect(on.handleSetRequest(true)).resolves.toBeUndefined()
            await drainMessages()
            counts(ports, 1, 2)
            await expect(on.handleGetRequest()).resolves.toBe(true)
            await drainMessages()
            expect(ports.map((port) => port.length)).toEqual(
                eventMode ? [4, 0] : [1, 2]
            )
        })

        it.each([
            [true, 'configured', 'configured', true],
            [true, 'configured', 'other', false],
            [false, 'configured', 'other', true],
            [true, undefined, 'Example Switch', true],
            [true, undefined, 'other', false],
            [false, '', 'fallback', true],
        ])(
            'filter=%s topic=%s input=%s accepts=%s',
            async (filter, topic, inputTopic, accepted) => {
                const { node, on, ports } = await load((flow) => {
                    Object.assign(flow[0], { filter, topic })
                })
                node.receive({ payload: { On: true }, topic: inputTopic })
                await drainMessages()
                expect(on.value).toBe(accepted)
                counts(ports, accepted ? 1 : 0, accepted ? 1 : 0)
                if (accepted)
                    expect(ports[0][0].topic).toBe(topic || inputTopic)
            }
        )

        it.each([true, false])(
            'passthrough=%s without and with Context',
            async (passthrough) => {
                const { node, on, ports } = await load((flow) => {
                    flow[1].allowMessagePassthrough = passthrough
                })
                node.receive({ payload: { On: true } })
                await drainMessages()
                expect(on.value).toBe(true)
                counts(ports, passthrough ? 1 : 0, passthrough ? 1 : 0)
                ports.forEach((port) => {
                    port.length = 0
                })
                node.receive({
                    payload: { On: false, Context: { source: 'test' } },
                })
                await drainMessages()
                expect(on.value).toBe(false)
                // service2 omits input Context from set events; change retains it.
                expect(ports.map((port) => port.length)).toEqual(
                    eventMode ? [passthrough ? 2 : 1, 0] : [1, 1]
                )
                const change = ports[0][0]
                expect(change.hap.context).toEqual({ source: 'test' })
                expect(change.hap.allChars.On).toBe(false)
            }
        )

        it('unreachable reads/writes reject and repeated valid input recovers', async () => {
            const { node, on, ports } = await load()
            const status = vi.spyOn(node, 'status')
            node.receive({ payload: { On: true } })
            await drainMessages()
            await expect(on.handleGetRequest()).resolves.toBe(true)
            for (let i = 0; i < 2; i++) {
                node.receive({ payload: { On: 'NO_RESPONSE' } })
                await drainMessages()
                expect(node.reachable).toBe(false)
                expect(status).toHaveBeenLastCalledWith({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Not reachable',
                    type: 'NO_RESPONSE',
                })
                await expect(on.handleGetRequest()).rejects.toBe(
                    HAPStatus.SERVICE_COMMUNICATION_FAILURE
                )
                await expect(on.handleSetRequest(false)).rejects.toBe(
                    HAPStatus.SERVICE_COMMUNICATION_FAILURE
                )
            }
            for (let i = 0; i < 2; i++) {
                node.receive({ payload: { On: true } })
                await drainMessages()
                expect(node.reachable).toBe(true)
                expect(on.value).toBe(true)
                await expect(on.handleGetRequest()).resolves.toBe(true)
            }
            await drainMessages()
            expect(
                ports.flat().some((msg) => msg.hap.reachable === false)
            ).toBe(true)
            expect(status.mock.lastCall?.[0]).not.toHaveProperty(
                'type',
                'NO_RESPONSE'
            )
            expect(ports.map((port) => port.length)).toEqual(
                eventMode ? [13, 0] : [1, 7]
            )
        })

        it.each([undefined, null, true, 42, 'bad', [], {}])(
            'rejects or ignores payload %j and still accepts valid input',
            async (payload) => {
                const { node, on, ports } = await load()
                const error = vi.spyOn(node, 'error')
                node.receive({ payload })
                await drainMessages()
                expect(on.value).toBe(false)
                counts(ports, 0, 0)
                if (
                    payload === undefined ||
                    payload === null ||
                    typeof payload !== 'object'
                ) {
                    expect(error).toHaveBeenCalled()
                }
                node.receive({
                    payload: { UnknownCharacteristic: true, On: true },
                })
                await drainMessages()
                expect(error).toHaveBeenCalledWith(
                    expect.stringContaining(
                        "Instead of 'UnknownCharacteristic'"
                    )
                )
                expect(on.value).toBe(true)
                counts(ports, 1, 1)
            }
        )

        it('unload removes listeners and reload produces exactly one action', async () => {
            const flow = buildFlow()
            const first = await load(undefined, flow)
            first.node.receive({ payload: { On: true } })
            await drainMessages()
            counts(first.ports, 1, 1)
            await helper.unload()
            expect(first.on.listeners('set')).not.toContain(
                first.node.onCharacteristicSet
            )
            expect(first.on.listeners('get')).not.toContain(
                first.node.onCharacteristicGet
            )
            expect(first.on.listeners('change')).not.toContain(
                first.node.onCharacteristicChange
            )
            const second = await load(undefined, flow)
            expect(second.node.accessory.UUID).toBe(first.node.accessory.UUID)
            expect(second.on.listenerCount('set')).toBe(1)
            expect(second.on.listenerCount('get')).toBe(1)
            second.on.value = false
            second.node.receive({ payload: { On: true } })
            await drainMessages()
            expect(second.on.value).toBe(true)
            counts(second.ports, 1, 1)
            counts(first.ports, 1, 1)
        })

        it('shares reachability with a linked child and preserves unrelated child status on recovery', async () => {
            const { node, on } = await load((flow) => {
                flow.push({
                    ...flow[0],
                    id: 'child',
                    name: 'Child Switch',
                    isParent: false,
                    parentService: flow[0].id,
                    wires: [['child-change'], ['child-set']],
                })
                flow.push(
                    { id: 'child-change', type: 'helper' },
                    { id: 'child-set', type: 'helper' }
                )
            })
            const child = helper.getNode('child') as any
            await vi.waitFor(() => expect(child.configured).toBe(true), {
                timeout: 2000,
            })
            const childOn = child.service.getCharacteristic(Characteristic.On)
            const childPorts: any[][] = [[], []]
            helper
                .getNode('child-change')
                .on('input', (msg) => childPorts[0].push(msg))
            helper
                .getNode('child-set')
                .on('input', (msg) => childPorts[1].push(msg))
            expect(node.service.linkedServices).toContain(child.service)
            expect(child.accessory).toBe(node.accessory)
            const status = vi.spyOn(child, 'status')
            for (const source of [node, child]) {
                source.receive({ payload: { On: true } })
                await drainMessages()
                await expect(childOn.handleGetRequest()).resolves.toBe(
                    childOn.value
                )
                for (let i = 0; i < 2; i++) {
                    source.receive({ payload: { On: 'NO_RESPONSE' } })
                    await drainMessages()
                    expect(node.reachable).toBe(false)
                    for (const characteristic of [on, childOn]) {
                        await expect(
                            characteristic.handleGetRequest()
                        ).rejects.toBe(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
                        await expect(
                            characteristic.handleSetRequest(true)
                        ).rejects.toBe(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
                    }
                }
                for (let i = 0; i < 2; i++) {
                    source.receive({ payload: { On: true } })
                    await drainMessages()
                    expect(node.reachable).toBe(true)
                    await expect(
                        childOn.handleSetRequest(true)
                    ).resolves.toBeUndefined()
                }
            }
            // Recovering the parent may clear NO_RESPONSE on children, but must
            // not clear an unrelated diagnostic installed in the meantime.
            child.nodeStatusUtils.setStatus({
                fill: 'blue',
                shape: 'dot',
                text: 'diagnostic',
            })
            status.mockClear()
            node.receive({ payload: { On: false } })
            await drainMessages()
            expect(status).not.toHaveBeenCalled()
            expect(childPorts.map((port) => port.length)).toEqual(
                eventMode ? [20, 0] : [1, 13]
            )
        })

        it('deleting a child unlinks only its service; deleting the parent removes its accessory', async () => {
            const { node } = await load((flow) => {
                flow.push({
                    ...flow[0],
                    id: 'child',
                    name: 'Child Switch',
                    isParent: false,
                    parentService: flow[0].id,
                    wires: [[], []],
                })
            })
            const child = helper.getNode('child') as any
            await vi.waitFor(() => expect(child.configured).toBe(true), {
                timeout: 2000,
            })
            const buildUtils = require(
                eventMode
                    ? '../../../build/lib/utils/ServiceUtils2'
                    : '../../../build/lib/utils/ServiceUtils'
            )
            const childDone = vi.fn()
            await buildUtils(child).onClose(true, childDone)
            expect(childDone).toHaveBeenCalledTimes(1)
            expect(node.accessory.services).not.toContain(child.service)
            expect(node.service.linkedServices).not.toContain(child.service)
            expect(node.hostNode.host.bridgedAccessories).toContain(
                node.accessory
            )
            let finish!: () => void
            const cleanup = new Promise<void>((resolve) => {
                finish = resolve
            })
            const destroy = vi
                .spyOn(node.accessory, 'destroy')
                .mockImplementation(() => cleanup)
            const parentDone = vi.fn()
            const closing = buildUtils(node).onClose(true, parentDone)
            expect(parentDone).not.toHaveBeenCalled()
            finish()
            await closing
            expect(destroy).toHaveBeenCalledTimes(1)
            expect(node.hostNode.host.bridgedAccessories).not.toContain(
                node.accessory
            )
            expect(parentDone).toHaveBeenCalledTimes(1)
        })

        it.each([
            '{broken',
            '{"On":{"minValue":\u0024{NRCHKB_MISSING_TEST_VARIABLE}}}',
        ])(
            'ignores invalid characteristic properties %s and remains operational',
            async (characteristicProperties) => {
                const { node, on, ports } = await load((flow) => {
                    flow[0].characteristicProperties = characteristicProperties
                })
                expect(JSON.stringify(helper.log().args)).toContain(
                    'Invalid characteristicProperties JSON'
                )
                node.receive({ payload: { On: true } })
                await drainMessages()
                expect(on.value).toBe(true)
                counts(ports, 1, 1)
            }
        )

        it('updates multiple supported characteristics and ignores unsupported keys', async () => {
            const { node, on, ports } = await load()
            const error = vi.spyOn(node, 'error')
            node.receive({
                payload: { On: true, Name: 'Renamed', Unknown: 10 },
            })
            await drainMessages()
            expect(on.value).toBe(true)
            expect(
                node.service.getCharacteristic(Characteristic.Name).value
            ).toBe('Renamed')
            counts(ports, 2, 2)
            expect(error).toHaveBeenCalledWith(
                expect.stringContaining("Instead of 'Unknown'")
            )
        })

        it.each(['missing-host', 'invalid-service', 'missing-parent'])(
            'handles %s without output and closes pending setup',
            async (scenario) => {
                const { serviceId, flow } = buildFlow()
                if (scenario === 'missing-host') flow[0].bridge = 'absent'
                if (scenario === 'invalid-service')
                    flow[0].serviceName = 'NotAService'
                if (scenario === 'missing-parent') {
                    flow[0].isParent = false
                    flow[0].parentService = 'absent'
                }
                await helper.load(nodes as never, flow)
                const node = helper.getNode(serviceId) as any
                const messages: any[] = []
                helper.getNode('h1').on('input', (msg) => messages.push(msg))
                helper.getNode('h2').on('input', (msg) => messages.push(msg))
                await drainMessages()
                expect(node.configured).not.toBe(true)
                expect(messages).toEqual([])
                if (scenario === 'missing-parent') {
                    expect(node.waitForParentTimer).toBeDefined()
                    const clear = vi.spyOn(globalThis, 'clearTimeout')
                    const timer = node.waitForParentTimer
                    await helper.unload()
                    expect(clear).toHaveBeenCalledWith(timer)
                    expect(node.waitForParentTimer).toBeUndefined()
                } else {
                    expect(JSON.stringify(helper.log().args)).toContain(
                        scenario === 'missing-host'
                            ? 'not found'
                            : 'Unknown HomeKit service'
                    )
                }
            }
        )
    })
}
