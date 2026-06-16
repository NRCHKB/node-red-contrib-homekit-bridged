import { Accessory, Bridge } from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import helper from 'node-red-node-test-helper'
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import { describeCommonSwitchServiceBehavior } from '../test-utils/common-switch-service-tests'
import { switchServiceBridgeFlow } from '../test-utils/data'
import { configureNodeRedTestSettings } from '../test-utils/vitest-helper'

const homekitBridgeNode = require('../../../build/nodes/bridge')
const nrchkb = require('../../../build/nodes/nrchkb')
const homekitServiceNode = require('../../../build/nodes/service')

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

vi.spyOn(Bridge.prototype, 'publish').mockImplementation(function () {
    return true as never
})
vi.spyOn(Bridge.prototype, 'unpublish').mockResolvedValue(undefined)
vi.spyOn(Accessory.prototype, 'publish').mockImplementation(function () {
    return true as never
})
vi.spyOn(Accessory.prototype, 'unpublish').mockResolvedValue(undefined)

describe('Service Node', () => {
    let cleanupUserDir: (() => void) | undefined

    beforeAll(async () => {
        cleanupUserDir = configureNodeRedTestSettings()
        await new Promise<void>((resolve) => helper.startServer(resolve))
    })

    afterAll(async () => {
        await new Promise<void>((resolve) => helper.stopServer(resolve))
        cleanupUserDir?.()
    })

    afterEach(() => {
        return helper.unload()
    })

    describeCommonSwitchServiceBehavior({
        buildFlow: switchServiceBridgeFlow,
        expectedType: 'homekit-service',
        nodes: [nrchkb, homekitBridgeNode, homekitServiceNode],
        title: 'shared switch behavior',
    })
})
