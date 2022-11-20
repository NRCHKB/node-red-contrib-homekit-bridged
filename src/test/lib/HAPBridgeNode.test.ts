import 'should'

import { loggerSetup } from '@nrchkb/logger'
import { describe, it } from 'mocha'
import should from 'should'

const HAPHostNode = require('../../lib/HAPHostNode')()

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

describe('HAPHostNode', function () {
    this.timeout(30000)

    it('string macify should pass', function (done) {
        const stringToMacify = 'BRIDGE NAME'
        HAPHostNode.macify(stringToMacify)
        done()
    })

    it('null string macify should fail', function (done) {
        const stringToMacify = null as unknown as string
        should.throws(() => {
            HAPHostNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })

    it('undefined string macify should fail', function (done) {
        const stringToMacify = undefined as unknown as string
        should.throws(() => {
            HAPHostNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })

    it('empty string macify should fail', function (done) {
        const stringToMacify = ''
        should.throws(() => {
            HAPHostNode.macify(stringToMacify)
        }, 'nodeId cannot be empty in macify process')
        done()
    })
})
