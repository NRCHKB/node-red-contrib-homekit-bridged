import { describe, expect, it } from 'vitest'

import { resolveLogLevel } from '../../lib/utils/LogUtils'

const node = (logLevel?: string, extra: Record<string, unknown> = {}) =>
    ({
        config: { logLevel },
        ...extra,
    }) as never

describe('LogUtils', () => {
    it('defaults to inherit', () => {
        expect(resolveLogLevel(node())).toBe('inherit')
    })

    it('uses host log level when node inherits', () => {
        expect(
            resolveLogLevel(
                node('inherit', {
                    hostNode: node('disabled'),
                })
            )
        ).toBe('disabled')
    })

    it('uses parent accessory level before host level', () => {
        expect(
            resolveLogLevel(
                node(undefined, {
                    hostNode: node('trace'),
                    parentNode: node('debug'),
                })
            )
        ).toBe('debug')
    })

    it('uses node level before host level', () => {
        expect(
            resolveLogLevel(
                node('error', {
                    hostNode: node('trace'),
                })
            )
        ).toBe('error')
    })
})
