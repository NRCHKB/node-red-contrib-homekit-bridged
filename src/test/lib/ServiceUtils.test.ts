import { describe, expect, it, vi } from 'vitest'

const buildServiceUtils = require('../../../build/lib/utils/ServiceUtils')
const buildServiceUtils2 = require('../../../build/lib/utils/ServiceUtils2')

const createNode = () =>
    ({
        config: {
            name: 'Example',
            waitForSetupMsg: true,
        },
        handleWaitForSetup: vi.fn(),
        error: vi.fn(),
        removeListener: vi.fn(),
        setupDone: false,
    }) as never

describe.each([
    ['ServiceUtils', buildServiceUtils],
    ['ServiceUtils2', buildServiceUtils2],
])('%s', (_label, build) => {
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
