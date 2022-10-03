import 'should'

import { loggerSetup } from '@nrchkb/logger'
import { afterEach, before, describe, it } from 'mocha'
import helper from 'node-red-node-test-helper'

import { switchService2BridgeFlow } from '../test-utils/data'
const homekitBridgeNode = require('../../nodes/bridge')
const nrchkb = require('../../nodes/nrchkb')
const homekitService2Node = require('../../nodes/service2')

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

describe('Service Node', function () {
    before(function (done) {
        helper.startServer(done)
    })

    after(function (done) {
        helper.stopServer(done)
    })

    afterEach(function () {
        helper.unload()
    })

    it('should be loaded', function (done) {
        const { serviceId, flow } = switchService2BridgeFlow()
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitService2Node],
                flow,
                function () {
                    try {
                        const s1 = helper.getNode(serviceId)
                        s1.should.have.property('type', 'homekit-service2')
                        done()
                    } catch (err) {
                        done(err)
                    }
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output ON:true payload', function (done) {
        const { serviceId, flow } = switchService2BridgeFlow()
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitService2Node],
                flow,
                function () {
                    const s1 = helper.getNode(serviceId)

                    s1.on('input', (msg: any) => {
                        try {
                            msg.payload.should.have.property('On', true)
                            done()
                        } catch (err) {
                            done(err)
                        }
                    })

                    s1.receive({ payload: { On: true } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output ON:false payload', function (done) {
        const { serviceId, flow } = switchService2BridgeFlow()
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitService2Node],
                flow,
                function () {
                    const s1 = helper.getNode(serviceId)

                    s1.on('input', function (msg: any) {
                        try {
                            msg.payload.should.have.property('On', false)
                            done()
                        } catch (err) {
                            done(err)
                        }
                    })

                    s1.receive({ payload: { On: false } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output reachable true', function (done) {
        const { serviceId, flow } = switchService2BridgeFlow()
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitService2Node],
                flow,
                function () {
                    const s1 = helper.getNode(serviceId)
                    const h1 = helper.getNode('h1')

                    let count = 0

                    h1.on('input', function (msg: any) {
                        if (count === 0) {
                            try {
                                msg.payload.should.have.property('On', true)
                                msg.hap.should.have.property('newValue', true)
                                msg.hap.should.have.property('reachable', true)
                                done()
                            } catch (err) {
                                done(err)
                            }
                            count++
                        }
                    })

                    s1.receive({ payload: { On: true } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('should output reachable false', function (done) {
        const { serviceId, flow } = switchService2BridgeFlow()
        helper
            .load(
                [nrchkb, homekitBridgeNode, homekitService2Node],
                flow,
                function () {
                    const s1 = helper.getNode(serviceId)
                    const h1 = helper.getNode('h1')

                    h1.on('input', function (msg: any) {
                        try {
                            msg.payload.should.have.property('On', false)
                            msg.hap.should.have.property('reachable', false)
                            // @ts-ignore
                            s1.status.should.be.calledWithExactly({
                                fill: 'red',
                                shape: 'ring',
                                text: 'Not reachable',
                                type: 'NO_RESPONSE',
                            })
                            done()
                        } catch (err) {
                            done(err)
                        }
                    })

                    s1.receive({ payload: { On: 'NO_RESPONSE' } })
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
