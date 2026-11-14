import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const html = readFileSync('build/nodes/nrchkb.html', 'utf8')
const forbiddenCodes = html.match(/const forbiddenPinCodes = \[[\s\S]*?]/)?.[0]
const validator = html.match(
    /const validatePinCode = function \(value\) [{][\s\S]*?\n {4}[}]/
)?.[0]
if (!forbiddenCodes || !validator) {
    throw new Error('HomeKit editor PIN validator not found')
}
const validate = vm.runInNewContext(
    `${forbiddenCodes}\n${validator}\nvalidatePinCode`,
    {
        RED: {
            validators: {
                regex: (pattern: RegExp) => (value: string) =>
                    pattern.test(value),
            },
        },
    }
) as (value: string) => boolean

describe('HomeKit editor PIN validation', () => {
    it.each(['03145154', '0314-5154', '031-45-154'])('accepts %s', (value) =>
        expect(validate(value)).toBe(true)
    )

    it.each([
        '',
        '0314515',
        '031451544',
        'x0314-5154x',
        '0314-5154\n',
        '031 45 154',
        '11111111',
        '1111-1111',
        '111-11-111',
        '12345678',
    ])('rejects malformed or forbidden PIN %s', (value) =>
        expect(validate(value)).toBe(false)
    )
})
