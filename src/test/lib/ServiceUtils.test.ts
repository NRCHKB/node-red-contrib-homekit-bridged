import {
    Accessory,
    Characteristic,
    HAPStatus,
    Service,
    uuid,
} from '@homebridge/hap-nodejs'
import { describe, expect, it, vi } from 'vitest'

const buildServiceUtils = require('../../../build/lib/utils/ServiceUtils')
const buildServiceUtils2 = require('../../../build/lib/utils/ServiceUtils2')

const createNode = () => ({
    config: {
        name: 'Example',
        waitForSetupMsg: true,
    },
    handleWaitForSetup: vi.fn(),
    error: vi.fn(),
    removeListener: vi.fn(),
    setupDone: false,
})

describe.each([
    ['ServiceUtils', buildServiceUtils],
    ['ServiceUtils2', buildServiceUtils2],
])('%s', (_label, build) => {
    it('completes close after initialization stopped before listener registration', async () => {
        const node = {
            ...createNode(),
            service: new Service.Switch('Partial'),
            publishTimers: {},
            nodeStatusUtils: { cleanup: vi.fn() },
        }
        const done = vi.fn()
        await expect(build(node).onClose(false, done)).resolves.toBeUndefined()
        expect(done).toHaveBeenCalledTimes(1)
        expect(node.nodeStatusUtils.cleanup).toHaveBeenCalledTimes(1)
    })
    it('reports accessory cleanup failure and still completes close exactly once', async () => {
        const accessory = new Accessory(
            'Switch',
            uuid.generate('cleanup-failure')
        )
        const destroy = vi
            .spyOn(accessory, 'destroy')
            .mockRejectedValue(new Error('destroy failed'))
        const node = {
            ...createNode(),
            config: { name: 'Switch', isParent: true },
            accessory,
            publishTimers: {},
            nodeStatusUtils: { cleanup: vi.fn() },
            hostNode: { host: { removeBridgedAccessories: vi.fn() } },
        }
        const done = vi.fn()
        await build(node).onClose(true, done)
        expect(destroy).toHaveBeenCalledTimes(1)
        expect(done).toHaveBeenCalledTimes(1)
        expect(node.nodeStatusUtils.cleanup).toHaveBeenCalledTimes(1)
        expect(node.error).toHaveBeenCalledWith(
            expect.stringContaining('destroy failed')
        )
    })

    it('reuses a service by subtype, renames it, and replaces it when its type changes', async () => {
        const accessory = new Accessory('Switch', uuid.generate('reuse-test'))
        const utils = build(createNode())
        const info = {
            name: 'First',
            UUID: 'stable-subtype',
            serviceName: 'Switch',
            config: {},
        }
        const first = await utils.getOrCreate(accessory, info)
        const again = await utils.getOrCreate(accessory, {
            ...info,
            name: 'Renamed',
        })
        expect(again).toBe(first)
        expect(again.getCharacteristic(Characteristic.Name).value).toBe(
            'Renamed'
        )
        const replaced = await utils.getOrCreate(accessory, {
            ...info,
            serviceName: 'Lightbulb',
        })
        expect(replaced).not.toBe(first)
        expect(replaced.UUID).toBe(Service.Lightbulb.UUID)
        expect(accessory.services).not.toContain(first)
        expect(
            accessory.services.filter(
                (service) => service.subtype === info.UUID
            )
        ).toEqual([replaced])
    })

    it('completes read callbacks exactly once and tolerates callback exceptions', () => {
        const node = {
            ...createNode(),
            reachable: true,
            config: { name: 'Switch', outputMode: 'legacy' },
        }
        const utils = build(node)
        const characteristic = new Characteristic.On()
        characteristic.value = true
        const get =
            _label === 'ServiceUtils2'
                ? utils.onCharacteristicGet([characteristic])
                : utils.onCharacteristicGet
        const success = vi.fn()
        get.call(characteristic, success)
        expect(success).toHaveBeenCalledExactlyOnceWith(null, true)
        node.reachable = false
        const failure = vi.fn()
        get.call(characteristic, failure)
        expect(failure).toHaveBeenCalledTimes(1)
        expect(failure.mock.calls[0][0]).toHaveProperty(
            'hapStatus',
            HAPStatus.SERVICE_COMMUNICATION_FAILURE
        )
        expect(() =>
            get.call(characteristic, () => {
                throw new Error('consumer failed')
            })
        ).not.toThrow()
    })

    it('ignores null payloads in setup messages', () => {
        const node = createNode()
        const utils = build(node)
        const resolve = vi.fn()

        expect(() =>
            utils.handleWaitForSetup(node.config, { payload: null }, resolve)
        ).not.toThrow()

        expect(resolve).not.toHaveBeenCalled()
        expect(node.setupDone).toBe(false)
    })

    it('keeps waiting for setup after malformed setup messages', () => {
        const node = createNode()
        const utils = build(node)
        const resolve = vi.fn()

        utils.handleWaitForSetup(
            node.config,
            { payload: { notNrchkb: true } },
            resolve
        )

        expect(resolve).not.toHaveBeenCalled()
        expect(node.setupDone).toBe(false)
        expect(node.removeListener).not.toHaveBeenCalled()
    })

    it('accepts valid setup messages', () => {
        const node = createNode()
        const utils = build(node)
        const resolve = vi.fn()

        utils.handleWaitForSetup(
            node.config,
            { payload: { nrchkb: { setup: { name: 'updated' } } } },
            resolve
        )

        expect(node.setupDone).toBe(true)
        expect(node.removeListener).toHaveBeenCalledWith(
            'input',
            node.handleWaitForSetup
        )
        expect(resolve).toHaveBeenCalledWith({
            name: 'updated',
            waitForSetupMsg: true,
        })
    })
})

it('preserves zero adaptive lighting temperature adjustment', () => {
    const options = (
        buildServiceUtils as typeof buildServiceUtils & {
            buildAdaptiveLightingOptions: (
                config: Record<string, unknown>
            ) => Record<string, unknown>
        }
    ).buildAdaptiveLightingOptions({
        adaptiveLightingOptionsMode: 1,
        adaptiveLightingOptionsCustomTemperatureAdjustment: 0,
    })

    expect(options).toMatchObject({
        controllerMode: 1,
        customTemperatureAdjustment: 0,
    })
})
