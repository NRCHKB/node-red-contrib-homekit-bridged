import 'should'

import { NodeStatus } from '@node-red/registry'
import assert from 'assert'
import { after, before, beforeEach, describe, it } from 'mocha'
import sinon, { SinonFakeTimers } from 'sinon'

import { NodeStatusUtils } from '../../lib/utils/NodeStatusUtils'

class NodeWithStatusMock {
    constructor(public currentStatus: string | NodeStatus = '') {}
    status(status: string | NodeStatus): void {
        this.currentStatus = status
    }
}

describe('NodeStatusUtils', function () {
    let node: NodeWithStatusMock
    let nodeStatusUtils: NodeStatusUtils
    let clock: SinonFakeTimers

    before(function () {
        clock = sinon.useFakeTimers()
    })

    after(function () {
        clock.restore()
    })

    beforeEach(function (done) {
        node = new NodeWithStatusMock()
        nodeStatusUtils = new NodeStatusUtils(node)
        done()
    })

    it('setStatus', function (done) {
        try {
            nodeStatusUtils.setStatus('test')
            assert.strictEqual(node.currentStatus, 'test')
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })

    it('clearStatus', function (done) {
        try {
            nodeStatusUtils.setStatus('test')
            assert.strictEqual(node.currentStatus, 'test')
            nodeStatusUtils.clearStatus()
            assert.strictEqual(node.currentStatus, '')
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })

    it('setStatusWithTimeout', function (done) {
        try {
            nodeStatusUtils.setStatus('test', 2000)
            assert.strictEqual(node.currentStatus, 'test')
            clock.tick(1000)
            assert.strictEqual(node.currentStatus, 'test')
            clock.tick(1000)
            assert.strictEqual(node.currentStatus, '')
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })

    it('setStatusWithTimeout - should not clear status with different id', function (done) {
        try {
            nodeStatusUtils.setStatus('test', 2000)
            assert.strictEqual(node.currentStatus, 'test')
            clock.tick(1000)
            assert.strictEqual(node.currentStatus, 'test')
            nodeStatusUtils.setStatus('test2', 2000)
            clock.tick(1000)
            assert.strictEqual(node.currentStatus, 'test2')
            clock.tick(1000)
            assert.strictEqual(node.currentStatus, '')
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })

    it('clearStatusByType - should not clear other type', function (done) {
        try {
            nodeStatusUtils.setStatus({ text: 'test' })
            assert.deepStrictEqual(node.currentStatus, { text: 'test' })
            nodeStatusUtils.clearStatusByType('NO_RESPONSE')
            assert.deepStrictEqual(node.currentStatus, { text: 'test' })
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })

    it('clearStatusByType - should clear same type', function (done) {
        try {
            nodeStatusUtils.setStatus({ text: 'test', type: 'NO_RESPONSE' })
            assert.deepStrictEqual(node.currentStatus, {
                text: 'test',
                type: 'NO_RESPONSE',
            })
            nodeStatusUtils.clearStatusByType('NO_RESPONSE')
            assert.deepStrictEqual(node.currentStatus, '')
            done()
        } catch (error: any) {
            done(new Error(error))
        }
    })
})
