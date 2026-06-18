import { CharacteristicEventTypes } from '@homebridge/hap-nodejs/dist/lib/Characteristic'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Storage } from '../../lib/Storage'

describe('Storage callback handling', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('cancels the timeout when a callback is loaded', () => {
        vi.useFakeTimers()

        const callback = vi.fn()
        const callbackID = Storage.saveCallback(
            {
                event: CharacteristicEventTypes.GET,
                callback,
            },
            1000
        )

        const loadedCallback = Storage.loadCallback(callbackID)

        expect(loadedCallback).toEqual({
            event: 'get',
            callback,
        })

        vi.advanceTimersByTime(1000)

        expect(callback).not.toHaveBeenCalled()
    })

    it('invokes the callback once after the ttl expires', () => {
        vi.useFakeTimers()

        const callback = vi.fn()
        Storage.saveCallback(
            {
                event: CharacteristicEventTypes.GET,
                callback,
            },
            1000
        )

        vi.advanceTimersByTime(1000)

        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('rejects when a stored service is missing', async () => {
        vi.spyOn(Storage, 'load').mockResolvedValueOnce(undefined)

        await expect(Storage.loadService('missing')).rejects.toBe(
            'Service data not exists'
        )
    })

    it('rejects when a stored service is corrupted', async () => {
        vi.spyOn(Storage, 'load').mockResolvedValueOnce({ nope: true })

        await expect(Storage.loadService('corrupt')).rejects.toBe(
            'Service data corrupted'
        )
    })

    it('rejects when loading a stored service fails', async () => {
        const error = new Error('storage failed')
        vi.spyOn(Storage, 'load').mockRejectedValueOnce(error)

        await expect(Storage.loadService('broken')).rejects.toBe(error)
    })
})
