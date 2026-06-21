import { afterEach, describe, expect, it, vi } from 'vitest'

import { Storage } from '../lib/Storage'

describe('Storage callback capacity', () => {
    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
    })

    it('drops the oldest callback when the callback cache reaches capacity', () => {
        vi.useFakeTimers()

        const firstCallback = vi.fn()
        const firstCallbackID = Storage.saveCallback(
            {
                event: 'get',
                callback: firstCallback,
            },
            60_000
        )

        let lastCallbackID = firstCallbackID

        for (let index = 1; index <= 1000; index += 1) {
            lastCallbackID = Storage.saveCallback(
                {
                    event: 'get',
                    callback: vi.fn(),
                },
                60_000
            )
        }

        expect(Storage.loadCallback(firstCallbackID)).toBeUndefined()
        expect(Storage.loadCallback(lastCallbackID)).toMatchObject({
            event: 'get',
        })

        vi.advanceTimersByTime(60_000)

        expect(firstCallback).not.toHaveBeenCalled()
    })

    it('returns undefined for unknown callback IDs', () => {
        expect(
            Storage.loadCallback('00000000-0000-4000-8000-000000000000')
        ).toBeUndefined()
    })
})
