import 'should'
import {describe, it} from 'mocha'
import should from 'should'

const HAPBridgeNode = require('../../../build/lib/HAPBridgeNode')({})

describe('HAPBridgeNode',  function () {
    this.timeout(30000)

    it('string macify should pass',  function (done) {
        const stringToMacify = "BRIDGE NAME"
        HAPBridgeNode.macify(stringToMacify)
        done()
    })

    it('null string macify should fail',  function (done) {
        const stringToMacify = null as unknown as string
        should.throws(() => {
            HAPBridgeNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })

    it('undefined string macify should fail',  function (done) {
        const stringToMacify = undefined as unknown as string
        should.throws(() => {
            HAPBridgeNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })

    it('empty string macify should fail',  function (done) {
        const stringToMacify = ""
        should.throws(() => {
            HAPBridgeNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })
})