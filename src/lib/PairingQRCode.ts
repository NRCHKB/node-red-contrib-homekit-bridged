import { composeQrCode } from 'homekit-code/lib/commands/qrcode/qrcode.utils'

import { normalizePinCode } from './PinCode'

export type FormattedPinCode = {
    bottom: string
    top: string
}

export const formatPinCodeForPairing = (pinCode: string): FormattedPinCode => {
    const cleanPinCode = normalizePinCode(pinCode)

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
        pairingCode: normalizePinCode(pinCode),
        setupUri,
    })

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
