import { Bridge, Characteristic, Service, uuid } from '@homebridge/hap-nodejs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const buildAccessoryUtils = require('../../../build/lib/utils/AccessoryUtils')

describe('Accessory identity', () => {
    afterEach(() => vi.restoreAllMocks())

    it.each(['name', 'manufacturer', 'model', 'serialNo'])(
        'reuses stable identity and replaces an accessory when %s changes',
        (property) => {
            const bridge = new Bridge(
                'Bridge',
                uuid.generate('identity-bridge')
            )
            const utils = buildAccessoryUtils({ config: { name: 'Switch' } })
            const info = {
                name: 'Switch',
                manufacturer: 'NRCHKB',
                model: 'Model',
                serialNo: 'Serial',
                UUID: uuid.generate('identity-first'),
            }
            const first = utils.getOrCreate(bridge, info, 'subtype')
            const service = first.addService(
                Service.Switch,
                'Switch',
                'subtype'
            )
            service.setCharacteristic(Characteristic.On, true)
            expect(utils.getOrCreate(bridge, info, 'subtype')).toBe(first)
            const destroy = vi
                .spyOn(first, 'destroy')
                .mockResolvedValue(undefined)
            const replacement = utils.getOrCreate(
                bridge,
                {
                    ...info,
                    [property]: 'Changed',
                    UUID: uuid.generate('identity-replacement'),
                },
                'subtype'
            )
            expect(replacement).not.toBe(first)
            expect(replacement.UUID).toBe(uuid.generate('identity-replacement'))
            expect(bridge.bridgedAccessories).toEqual([replacement])
            expect(replacement.services).toContain(service)
            expect(service.getCharacteristic(Characteristic.On).value).toBe(
                true
            )
            expect(destroy).toHaveBeenCalledTimes(1)
            expect(
                utils.getOrCreate(
                    bridge,
                    { ...info, [property]: 'Changed', UUID: replacement.UUID },
                    'subtype'
                )
            ).toBe(replacement)
        }
    )
})
