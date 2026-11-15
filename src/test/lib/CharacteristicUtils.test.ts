import { Characteristic, Service } from '@homebridge/hap-nodejs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const buildLegacy = require('../../../build/lib/utils/CharacteristicUtils')
const buildEvent = require('../../../build/lib/utils/CharacteristicUtils2')

describe.each([
    ['legacy', buildLegacy],
    ['event', buildEvent],
])('%s characteristic configuration', (_name, build) => {
    afterEach(() => vi.restoreAllMocks())
    const createNode = () => ({
        config: { name: 'Temperature' },
        RED: { util: { evaluateNodeProperty: vi.fn(() => '-20') } },
        error: vi.fn(),
        nodeStatusUtils: { setStatus: vi.fn() },
    })

    it('applies properties and environment substitutions to real HAP objects', () => {
        const node = createNode()
        const service = new Service.TemperatureSensor('Temperature')
        const props = build(node).load(service, {
            characteristicProperties:
                '{"CurrentTemperature":{"minValue":${MIN_TEMP},"maxValue":80}}',
        })
        expect(props.CurrentTemperature).toMatchObject({
            minValue: -20,
            maxValue: 80,
        })
        expect(
            service.getCharacteristic(Characteristic.CurrentTemperature).props
        ).toMatchObject({ minValue: -20, maxValue: 80 })
        expect(node.RED.util.evaluateNodeProperty).toHaveBeenCalledWith(
            'MIN_TEMP',
            'env',
            node,
            {}
        )
    })

    it('subscribes to required and optional characteristics and retains removable listeners', () => {
        const node = createNode() as any
        const service = new Service.TemperatureSensor('Temperature')
        const supported = build(node).subscribeAndGetSupported(service)
        expect(supported.has('CurrentTemperature')).toBe(true)
        for (const characteristic of [
            ...service.characteristics,
            ...service.optionalCharacteristics,
        ]) {
            expect(characteristic.listeners('get')).toContain(
                node.onCharacteristicGet
            )
            expect(characteristic.listeners('set')).toContain(
                node.onCharacteristicSet
            )
            expect(characteristic.listeners('change')).toContain(
                node.onCharacteristicChange
            )
        }
        expect(
            service.getCharacteristic(Characteristic.CurrentTemperature).props
                .minValue
        ).toBe(-100)
    })
})
