import type { NodeStatus } from '@node-red/registry'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { NodeStatusUtils } from '../../lib/utils/NodeStatusUtils'

class NodeWithStatusMock {
  constructor(public currentStatus: string | NodeStatus = '') {}
  status(status: string | NodeStatus): void {
    this.currentStatus = status
  }
}

describe('NodeStatusUtils', () => {
  let node: NodeWithStatusMock
  let nodeStatusUtils: NodeStatusUtils

  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    node = new NodeWithStatusMock()
    nodeStatusUtils = new NodeStatusUtils(node)
  })

  it('setStatus', () => {
    nodeStatusUtils.setStatus('test')
    expect(node.currentStatus).toBe('test')
  })

  it('clearStatus', () => {
    nodeStatusUtils.setStatus('test')
    expect(node.currentStatus).toBe('test')
    nodeStatusUtils.clearStatus()
    expect(node.currentStatus).toBe('')
  })

  it('setStatusWithTimeout', () => {
    nodeStatusUtils.setStatus('test', 2000)
    expect(node.currentStatus).toBe('test')
    vi.advanceTimersByTime(1000)
    expect(node.currentStatus).toBe('test')
    vi.advanceTimersByTime(1000)
    expect(node.currentStatus).toBe('')
  })

  it('setStatusWithTimeout - should not clear status with different id', () => {
    nodeStatusUtils.setStatus('test', 2000)
    expect(node.currentStatus).toBe('test')
    vi.advanceTimersByTime(1000)
    expect(node.currentStatus).toBe('test')
    nodeStatusUtils.setStatus('test2', 2000)
    vi.advanceTimersByTime(1000)
    expect(node.currentStatus).toBe('test2')
    vi.advanceTimersByTime(1000)
    expect(node.currentStatus).toBe('')
  })

  it('clearStatusByType - should not clear other type', () => {
    nodeStatusUtils.setStatus({ text: 'test' })
    expect(node.currentStatus).toStrictEqual({ text: 'test' })
    nodeStatusUtils.clearStatusByType('NO_RESPONSE')
    expect(node.currentStatus).toStrictEqual({ text: 'test' })
  })

  it('clearStatusByType - should clear same type', () => {
    nodeStatusUtils.setStatus({ text: 'test', type: 'NO_RESPONSE' })
    expect(node.currentStatus).toStrictEqual({
      text: 'test',
      type: 'NO_RESPONSE'
    })
    nodeStatusUtils.clearStatusByType('NO_RESPONSE')
    expect(node.currentStatus).toStrictEqual('')
  })
})
