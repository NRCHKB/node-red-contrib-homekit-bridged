import { describe, expect, it } from 'vitest'

const PairingQRCode = require('../../../build/lib/PairingQRCode')

describe('PairingQRCode', () => {
    describe('formatPinCodeForPairing', () => {
        it('formats the legacy HomeKit pin format', () => {
            expect(PairingQRCode.formatPinCodeForPairing('123-45-678')).toEqual(
                {
                    bottom: '5678',
                    top: '1234',
                }
            )
        })

        it('formats the compact HomeKit pin format used by the editor', () => {
            expect(PairingQRCode.formatPinCodeForPairing('1234-5678')).toEqual({
                bottom: '5678',
                top: '1234',
            })
        })

        it('rejects empty or malformed pin codes', () => {
            expect(() => PairingQRCode.formatPinCodeForPairing('')).toThrow()
            expect(() =>
                PairingQRCode.formatPinCodeForPairing('12345678')
            ).toThrow()
            expect(() =>
                PairingQRCode.formatPinCodeForPairing('12<3-45-678')
            ).toThrow()
        })
    })

    describe('createPairingQRCodeDataURL', () => {
        it('returns a HomeKit pairing label SVG data URL', async () => {
            const dataUrl = await PairingQRCode.createPairingQRCodeDataURL(
                'X-HM://0081YCYEP3QYT',
                '8413-1633'
            )

            expect(dataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
            expect(decodeURIComponent(dataUrl)).toContain(
                '<title>HomeKit QR Code</title>'
            )
            expect(decodeURIComponent(dataUrl)).toContain(
                '<use href="#8" height="48" width="34" x="174" y="30"/>'
            )
        })
    })
})
