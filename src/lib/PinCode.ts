import NRCHKBError from './NRCHKBError'

export const normalizePinCode = (pinCode: string): string => {
    if (typeof pinCode !== 'string' || !pinCode) {
        throw new NRCHKBError('Pin code cannot be empty')
    }

    if (
        pinCode.trim() !== pinCode ||
        !/^(?:\d{8}|\d{3}-\d{2}-\d{3}|\d{4}-\d{4})$/.test(pinCode)
    ) {
        throw new NRCHKBError(`Invalid HomeKit pin code format: ${pinCode}`)
    }

    return pinCode.replace(/-/g, '')
}
