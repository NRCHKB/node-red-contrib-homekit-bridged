const HAPHostNode = require('../../../src/lib/HAPHostNode')({})

describe('HAPHostNode', function () {
    test('string macify should pass', () => {
        expect(() => {
            HAPHostNode.macify('BRIDGE NAME')
        }).not.toThrow()
    })

    test('null string macify should fail', () => {
        expect(() => {
            HAPHostNode.macify(null as unknown as string)
        }).toThrow('nodeId cannot be empty in macify process')
    })

    test('undefined string macify should fail', () => {
        expect(() => {
            HAPHostNode.macify(undefined as unknown as string)
        }).toThrow('nodeId cannot be empty in macify process')
    })

    test('empty string macify should fail', () => {
        expect(() => {
            HAPHostNode.macify('')
        }).toThrow('nodeId cannot be empty in macify process')
    })
})
