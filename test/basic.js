('use strict')

const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

const assert = require('assert')

let RED = require('./node-red-mock.js').RED

describe('homekit', function() {
    describe('#loading', function() {
        it('should load without error', function() {
            require('../homekit.js')(RED)
            assert.ok(true)
        })
    })
})
