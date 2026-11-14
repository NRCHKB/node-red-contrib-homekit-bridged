import { describe, expect, it } from 'vitest'
import {
    AdaptiveLightingControllerMode,
    Formats,
    Perms,
} from '../../lib/hap/hap-nodejs'

describe('hap-nodejs compatibility shim', () => {
    it('re-exports the public constants used by the project', () => {
        expect(Formats.FLOAT).toBe('float')
        expect(Perms.PAIRED_READ).toBe('pr')
        expect(AdaptiveLightingControllerMode.AUTOMATIC).toBe(1)
    })
})
