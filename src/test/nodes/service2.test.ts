import { loggerSetup } from '@nrchkb/logger'
import helper from 'node-red-node-test-helper'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { switchService2BridgeFlow } from '../test-utils/data'

const homekitBridgeNode = require('../../../build/nodes/bridge')
const nrchkb = require('../../../build/nodes/nrchkb')
const homekitService2Node = require('../../../build/nodes/service2')

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
  debugEnabled: true,
  errorEnabled: true,
  traceEnabled: false
})

describe('Service Node', () => {
  beforeAll(() => new Promise<void>((resolve) => helper.startServer(resolve)))

  afterAll(() => new Promise<void>((resolve) => helper.stopServer(resolve)))

  afterEach(() => {
    return helper.unload()
  })

  it('should be loaded', async () => {
    const { serviceId, flow } = switchService2BridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitService2Node], flow)
    const s1 = helper.getNode(serviceId)
    expect(s1).toHaveProperty('type', 'homekit-service2')
  })

  it('should output ON:true payload', async () => {
    const { serviceId, flow } = switchService2BridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitService2Node], flow)
    const s1 = helper.getNode(serviceId)

    await new Promise<void>((resolve) => {
      s1.on('input', (msg: any) => {
        expect(msg.payload).toHaveProperty('On', true)
        resolve()
      })

      s1.receive({ payload: { On: true } })
    })
  })

  it('should output ON:false payload', async () => {
    const { serviceId, flow } = switchService2BridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitService2Node], flow)
    const s1 = helper.getNode(serviceId)

    await new Promise<void>((resolve) => {
      s1.on('input', (msg: any) => {
        expect(msg.payload).toHaveProperty('On', false)
        resolve()
      })

      s1.receive({ payload: { On: false } })
    })
  })

  it('should output reachable true', async () => {
    const { serviceId, flow } = switchService2BridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitService2Node], flow)
    const s1 = helper.getNode(serviceId)
    const h1 = helper.getNode('h1')

    let count = 0

    await new Promise<void>((resolve) => {
      h1.on('input', (msg: any) => {
        if (count === 0) {
          expect(msg.payload).toHaveProperty('On', true)
          expect(msg.hap).toHaveProperty('newValue', true)
          expect(msg.hap).toHaveProperty('reachable', true)
          resolve()
          count++
        }
      })

      s1.receive({ payload: { On: true } })
    })
  })

  it('should output reachable false', async () => {
    const { serviceId, flow } = switchService2BridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitService2Node], flow)
    const s1 = helper.getNode(serviceId)
    const h1 = helper.getNode('h1')

    await new Promise<void>((resolve, reject) => {
      const statusSpy = vi
        .spyOn(s1 as any, 'status')
        .mockImplementation(() => {})

      h1.on('input', (msg: any) => {
        try {
          expect(msg.payload).toHaveProperty('On', false)
          expect(msg.hap).toHaveProperty('reachable', false)
          expect(statusSpy).toHaveBeenCalledWith({
            fill: 'red',
            shape: 'ring',
            text: 'Not reachable',
            type: 'NO_RESPONSE'
          })
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      s1.receive({ payload: { On: 'NO_RESPONSE' } })
    })
  })
})
