import { loggerSetup } from '@nrchkb/logger'
import { describe, expect, it, vi } from 'vitest'

const HAPHostNodeFactory = require('../../../build/lib/HAPHostNode')
const HostType = require('../../../build/lib/types/HostType').default

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

const createRED = () =>
    ({
        nodes: {
            createNode: vi.fn(),
        },
    }) as never

const createNode = () => {
    const handlers = new Map<string, (...args: any[]) => void>()
    const node = {
        error: vi.fn(),
        id: 'bridge.1.2',
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            handlers.set(event, handler)
        }),
    } as Record<string, any>

    return {
        handlers,
        node,
    }
}

describe('HAPHostNode lifecycle', () => {
    it('rejects invalid bridge names', () => {
        const RED = createRED()
        const { node } = createNode()
        const { init } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        const result = init.call(node, {
            allowInsecureRequest: false,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bindType: 'str',
            bridgeName: 'invalid.name',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1111-1111',
            port: 0,
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        expect(result).toBeInstanceOf(Error)
        expect(result).toHaveProperty('message', 'Host name is incorrect')
        expect(node.host).toBeUndefined()
    })

    it('normalizes publish settings and parses JSON bind values', () => {
        const RED = createRED()
        const { node, handlers } = createNode()
        const { init, macify } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        init.call(node, {
            allowInsecureRequest: true,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bind: '["127.0.0.1"]',
            bindType: 'json',
            bridgeName: 'Bridge',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1234-5678',
            port: 51826,
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        node.host.publish = vi.fn()

        expect(node.publish()).toBe(true)
        expect(node.host.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                bind: ['127.0.0.1'],
                category: expect.anything(),
                pincode: '123-45-678',
                port: 51826,
                username: macify('bridge.1.2'),
            }),
            true
        )
        expect(node.published).toBe(true)
        expect(handlers.get('close')).toBeDefined()
    })

    it('passes string bind values through unchanged', () => {
        const RED = createRED()
        const { node } = createNode()
        const { init } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        init.call(node, {
            allowInsecureRequest: true,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bind: '127.0.0.1',
            bindType: 'str',
            bridgeName: 'Bridge',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1234-5678',
            port: 51826,
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        node.host.publish = vi.fn()

        expect(node.publish()).toBe(true)
        expect(node.host.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                bind: '127.0.0.1',
            }),
            true
        )
    })

    it('refuses to publish on the reserved Node-RED port', () => {
        const RED = createRED()
        const { node } = createNode()
        const { init } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        init.call(node, {
            allowInsecureRequest: false,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bindType: 'str',
            bridgeName: 'Bridge',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1111-1111',
            port: 1880,
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        node.host.publish = vi.fn()

        expect(node.publish()).toBe(false)
        expect(node.host.publish).not.toHaveBeenCalled()
        expect(node.published).toBe(false)
        expect(node.error).toHaveBeenCalled()
    })

    it('refuses the reserved Node-RED port when imported as a string', () => {
        const RED = createRED()
        const { node } = createNode()
        const { init } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        init.call(node, {
            allowInsecureRequest: false,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bindType: 'str',
            bridgeName: 'Bridge',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1111-1111',
            port: '1880',
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        node.host.publish = vi.fn()

        expect(node.publish()).toBe(false)
        expect(node.host.publish).not.toHaveBeenCalled()
        expect(node.published).toBe(false)
        expect(node.error).toHaveBeenCalled()
    })

    it('unpublishes on restart and destroys on delete', async () => {
        const RED = createRED()
        const { node, handlers } = createNode()
        const { init } = HAPHostNodeFactory(RED, HostType.BRIDGE)

        init.call(node, {
            allowInsecureRequest: false,
            allowMessagePassthrough: true,
            accessoryCategory: 1,
            advertiser: 'bonjour-hap',
            bindType: 'str',
            bridgeName: 'Bridge',
            firmwareRev: '1.0.0',
            hardwareRev: '1.0.0',
            manufacturer: 'NRCHKB',
            model: '1.0.0',
            pinCode: '1111-1111',
            port: 51826,
            serialNo: 'serial',
            softwareRev: '1.0.0',
        } as never)

        node.host.unpublish = vi.fn().mockResolvedValue(undefined)
        node.host.destroy = vi.fn().mockResolvedValue(undefined)

        const closeHandler = handlers.get('close')
        expect(closeHandler).toBeTypeOf('function')

        const restartDone = vi.fn()
        await closeHandler?.(false, restartDone)
        expect(node.host.unpublish).toHaveBeenCalledTimes(1)
        expect(node.host.destroy).not.toHaveBeenCalled()
        expect(node.published).toBe(false)
        expect(restartDone).toHaveBeenCalledTimes(1)

        const deleteDone = vi.fn()
        await closeHandler?.(true, deleteDone)
        expect(node.host.destroy).toHaveBeenCalledTimes(1)
        expect(deleteDone).toHaveBeenCalledTimes(1)
    })
})
