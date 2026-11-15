import { afterEach, describe, expect, it } from 'vitest'

import { resolveLogLevel, setDefaultLogLevel } from '../../lib/utils/LogUtils'

afterEach(() => setDefaultLogLevel())

const node = (logLevel?: string, extra: Record<string, unknown> = {}) =>
    ({
        config: { logLevel },
        ...extra,
    }) as never

describe('LogUtils', () => {
    it('inherits the NRCHKB level through hosts and services', () => {
        setDefaultLogLevel('TRACE')
        expect(resolveLogLevel(node('inherit'))).toBe('trace')
        expect(
            resolveLogLevel(
                node('inherit', {
                    hostNode: node('inherit'),
                    parentNode: node('inherit'),
                })
            )
        ).toBe('trace')
        setDefaultLogLevel('inherit')
        expect(resolveLogLevel(node())).toBe('inherit')
    })

    it('preserves host, service, and parent overrides over the NRCHKB default', () => {
        setDefaultLogLevel('disabled')
        expect(
            resolveLogLevel(node('inherit', { hostNode: node('error') }))
        ).toBe('error')
        expect(
            resolveLogLevel(node('debug', { hostNode: node('error') }))
        ).toBe('debug')
        expect(
            resolveLogLevel(
                node('inherit', {
                    hostNode: node('error'),
                    parentNode: node('trace'),
                })
            )
        ).toBe('trace')
    })

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
