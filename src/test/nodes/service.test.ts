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

import { switchServiceBridgeFlow } from '../test-utils/data'
const homekitBridgeNode = require('../../../build/nodes/bridge')
const nrchkb = require('../../../build/nodes/nrchkb')
const homekitServiceNode = require('../../../build/nodes/service')

loggerSetup({
  debugEnabled: true,
  errorEnabled: true,
  traceEnabled: false
})

describe('Service Node', function () {
  beforeAll(function () {
    return new Promise<void>((resolve) => helper.startServer(resolve))
  })

  afterAll(function () {
    return new Promise<void>((resolve) => helper.stopServer(resolve))
  })

  afterEach(function () {
    helper.unload()
  })

  it('should be loaded', async function () {
    const { serviceId, flow } = switchServiceBridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)
    const s1 = helper.getNode(serviceId)
    expect(s1).toHaveProperty('type', 'homekit-service')
  })

  it('should output ON:true payload', async function () {
    const { serviceId, flow } = switchServiceBridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)
    const s1 = helper.getNode(serviceId)

    await new Promise<void>((resolve) => {
      s1.on('input', (msg: any) => {
        expect(msg.payload).toHaveProperty('On', true)
        resolve()
      })

      s1.receive({ payload: { On: true } })
    })
  })

  it('should output ON:false payload', async function () {
    const { serviceId, flow } = switchServiceBridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)
    const s1 = helper.getNode(serviceId)

    await new Promise<void>((resolve) => {
      s1.on('input', function (msg: any) {
        expect(msg.payload).toHaveProperty('On', false)
        resolve()
      })

      s1.receive({ payload: { On: false } })
    })
  })

  it('should output reachable true', async function () {
    const { serviceId, flow } = switchServiceBridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)
    const s1 = helper.getNode(serviceId)
    const h1 = helper.getNode('h1')

    let count = 0

    await new Promise<void>((resolve) => {
      h1.on('input', function (msg: any) {
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

  it('should output reachable false', async function () {
    const { serviceId, flow } = switchServiceBridgeFlow()
    await helper.load([nrchkb, homekitBridgeNode, homekitServiceNode], flow)
    const s1 = helper.getNode(serviceId)
    const h1 = helper.getNode('h1')

    await new Promise<void>((resolve, reject) => {
      // spy status so we can assert it was called
      const statusSpy = vi
        .spyOn(s1 as any, 'status')
        .mockImplementation(() => {})

      h1.on('input', function (msg: any) {
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
