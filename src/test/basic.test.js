const mocha = require('mocha')
const describe = mocha.describe
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const it = mocha.it

const helper = require('node-red-node-test-helper')
const homekitNode = require('../homekit')

const exampleFlow = require('./exampleFlow.json')

helper.init(require.resolve('node-red'))

describe('nrchkb node', function() {
    beforeEach(function(done) {
        helper.startServer(done)
    })

    afterEach(function(done) {
        helper.unload()
        helper.stopServer(done)
    })

    it('should load example flow', function(done) {
        helper.load(homekitNode, exampleFlow, function() {
            var temperatureSenor = helper.getNode('2b7e7cd6.eb9804')
            temperatureSenor.should.have.property(
                'serviceName',
                'TemperatureSensor'
            )
            done()
        })
    })

    it('should receive payload', function(done) {
        helper.load(homekitNode, exampleFlow, function() {
            var battery = helper.getNode('715d2971.329e48')

            battery.on('input', function(msg) {
                msg.should.have.property('payload', { ChargingState: 1 })
                done()
            })

            battery.receive({ payload: { ChargingState: 1 } })
        })
    })

    it('should not match payload', function(done) {
        helper.load(homekitNode, exampleFlow, function() {
            var battery = helper.getNode('715d2971.329e48')

            battery.on('input', function(msg) {
                msg.should.not.have.property('payload', { ChargingState: 0 })
                done()
            })

            battery.receive({ payload: { ChargingState: 1 } })
        })
    })
})
