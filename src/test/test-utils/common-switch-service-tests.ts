import type nodeRedTestHelper from 'node-red-node-test-helper'
import { describe, expect, it, vi } from 'vitest'

import { helper } from './vitest-helper'

type FlowBuilderResult = {
    flow: nodeRedTestHelper.TestFlows
    serviceId: string
}

type CommonSwitchServiceOptions = {
    buildFlow: () => FlowBuilderResult
    expectedType: 'homekit-service' | 'homekit-service2'
    nodes: unknown[]
    title: string
}

export function describeCommonSwitchServiceBehavior({
    buildFlow,
    expectedType,
    nodes,
    title,
}: CommonSwitchServiceOptions) {
    describe(title, () => {
        it('loads the node', async () => {
            const { serviceId, flow } = buildFlow()
            await helper.load(nodes as never, flow)
            const node = helper.getNode(serviceId)
            expect(node).toHaveProperty('type', expectedType)
        })

        it('routes On:true payloads', async () => {
            const { serviceId, flow } = buildFlow()
            await helper.load(nodes as never, flow)
            const node = helper.getNode(serviceId)

            await new Promise<void>((resolve) => {
                node.on('input', (msg: any) => {
                    expect(msg.payload).toHaveProperty('On', true)
                    resolve()
                })

                node.receive({ payload: { On: true } })
            })
        })

        it('routes On:false payloads', async () => {
            const { serviceId, flow } = buildFlow()
            await helper.load(nodes as never, flow)
            const node = helper.getNode(serviceId)

            await new Promise<void>((resolve) => {
                node.on('input', (msg: any) => {
                    expect(msg.payload).toHaveProperty('On', false)
                    resolve()
                })

                node.receive({ payload: { On: false } })
            })
        })

        it('emits reachability when reachable', async () => {
            const { serviceId, flow } = buildFlow()
            await helper.load(nodes as never, flow)
            const node = helper.getNode(serviceId)
            const outputNode = helper.getNode('h1')

            await new Promise<void>((resolve) => {
                outputNode.on('input', (msg: any) => {
                    expect(msg.payload).toHaveProperty('On', true)
                    expect(msg.hap).toHaveProperty('newValue', true)
                    expect(msg.hap).toHaveProperty('reachable', true)
                    resolve()
                })

                node.receive({ payload: { On: true } })
            })
        })

        it('emits reachability when unreachable', async () => {
            const { serviceId, flow } = buildFlow()
            await helper.load(nodes as never, flow)
            const node = helper.getNode(serviceId)
            const outputNode = helper.getNode('h1')
            const statusSpy = vi
                .spyOn(node as any, 'status')
                .mockImplementation(() => {})

            await new Promise<void>((resolve, reject) => {
                outputNode.on('input', (msg: any) => {
                    try {
                        expect(msg.payload).toHaveProperty('On', false)
                        expect(msg.hap).toHaveProperty('reachable', false)
                        expect(statusSpy).toHaveBeenCalledWith({
                            fill: 'red',
                            shape: 'ring',
                            text: 'Not reachable',
                            type: 'NO_RESPONSE',
                        })
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })

                node.receive({ payload: { On: 'NO_RESPONSE' } })
            })
        })
    })
}
