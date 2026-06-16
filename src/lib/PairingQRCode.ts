import { composeQrCode } from 'homekit-code/lib/commands/qrcode/qrcode.utils'

import NRCHKBError from './NRCHKBError'

export type FormattedPinCode = {
    bottom: string
    top: string
}

const pinCodeRegex = /^(?:\d{3}-\d{2}-\d{3}|\d{4}-\d{4})$/

export const formatPinCodeForPairing = (pinCode: string): FormattedPinCode => {
    if (!pinCode) {
        throw new NRCHKBError('Pin code cannot be empty')
    }

    if (!pinCodeRegex.test(pinCode)) {
        throw new NRCHKBError(`Invalid HomeKit pin code format: ${pinCode}`)
    }

    const cleanPinCode = pinCode.replace(/\D/g, '')

    return {
        bottom: cleanPinCode.slice(4),
        top: cleanPinCode.slice(0, 4),
    }
}

export const createPairingQRCodeDataURL = async (
    setupUri: string,
    pinCode: string
) => {
    const svg = await composeQrCode({
        pairingCode: pinCode.replace(/\D/g, ''),
        setupUri,
    })

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
