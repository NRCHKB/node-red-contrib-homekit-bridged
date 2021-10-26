import * as BadgeGenerator from '../../../src/lib/BadgeGenerator'

// @ponicode
describe('BadgeGenerator.BadgeGenerator.preparePincodeForQrcode', () => {
    test('0', () => {
        let result: any =
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('123-45-678')
        expect(result).toEqual({ top: '1234', bottom: '5678' })
    })

    test('1', () => {
        let result: any =
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('000-00-000')
        expect(result).toEqual({ top: '0000', bottom: '0000' })
    })

    test('2', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('\\TEST')
        }

        expect(callFunction).toThrow()
    })

    test('3', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('')
        }

        expect(callFunction).toThrow()
    })

    test('4', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('TEST')
        }

        expect(callFunction).toThrow()
    })

    test('5', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode(
                '0.10.10.1-0.10.1-0.10.10.1'
            )
        }

        expect(callFunction).toThrow()
    })

    test('6', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('000-00-000/')
        }

        expect(callFunction).toThrow()
    })

    test('7', () => {
        let callFunction: any = () => {
            BadgeGenerator.BadgeGenerator.preparePincodeForQrcode('12<3-45-678')
        }

        expect(callFunction).toThrow()
    })
})
