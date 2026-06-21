import { describe, expect, it } from 'vitest'
import { assertProtectControllerConfig } from '../../../lib/unifi/ProtectDiscovery'

describe('UniFi Protect discovery validation', () => {
    it('accepts a Protect controller with credentials', () => {
        expect(() =>
            assertProtectControllerConfig(
                {
                    id: 'controller1',
                    type: 'homekit-unifi-controller',
                    application: 'protect',
                    address: '192.168.1.1',
                },
                {
                    username: 'homekit',
                    password: 'secret',
                }
            )
        ).not.toThrow()
    })

    it('rejects missing connection details', () => {
        expect(() =>
            assertProtectControllerConfig(
                {
                    id: 'controller1',
                    type: 'homekit-unifi-controller',
                    application: 'protect',
                },
                {
                    username: 'homekit',
                }
            )
        ).toThrow('address is required')
    })
})
