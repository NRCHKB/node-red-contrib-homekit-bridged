import { loggerSetup } from '@nrchkb/logger'
import { describe, expect, it } from 'vitest'

const HAPHostNode = require('../../../build/lib/HAPHostNode')()

loggerSetup({
  debugEnabled: true,
  errorEnabled: true,
  traceEnabled: false
})

describe('HAPHostNode', function () {
  // allow longer for this suite (configured via package.json vitest.test.testTimeout)

  it('string macify should pass', function () {
    const stringToMacify = 'BRIDGE NAME'
    HAPHostNode.macify(stringToMacify)
  })

  it('null string macify should fail', function () {
    const stringToMacify = null as unknown as string
    expect(() => {
      HAPHostNode.macify(stringToMacify)
    }).toThrow('nodeId cannot be empty in macify process')
  })

  it('undefined string macify should fail', function () {
    const stringToMacify = undefined as unknown as string
    expect(() => {
      HAPHostNode.macify(stringToMacify)
    }).toThrow('nodeId cannot be empty in macify process')
  })

  it('empty string macify should fail', function () {
    const stringToMacify = ''
    expect(() => {
      HAPHostNode.macify(stringToMacify)
    }).toThrow('nodeId cannot be empty in macify process')
  })
})
