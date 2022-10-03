import 'should'

import { loggerSetup } from '@nrchkb/logger'
import assert from 'assert'
import { afterEach, before, describe, it } from 'mocha'
import helper from 'node-red-node-test-helper'

import { version } from '../../../package.json'
import {
    accessoryCategoriesResponse,
    serviceTypesResponse,
} from '../test-utils/data'

const API = require('../../lib/api')()
const nrchkb = require('../../nodes/nrchkb')

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

describe('api', function () {
    this.timeout(30000)

    before(function (done) {
        helper.startServer(done)
    })

    after(function (done) {
        helper.stopServer(done)
    })

    afterEach(function () {
        helper.unload()
    })

    it('Service API', function (done) {
        helper
            .load([nrchkb], [], function () {
                helper
                    .request()
                    .get('/nrchkb/service/types')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .then((response) => {
                        assert.deepStrictEqual(
                            response.body,
                            serviceTypesResponse
                        )
                        done()
                    })
                    .catch((err) => done(err))
            })
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    describe('stringifyVersion', function () {
        it('release', function (done) {
            const input = '1.2.3'
            const expected = '1.2.3'
            const result = API.stringifyVersion(input)
            assert.strictEqual(result, expected)
            done()
        })

        it('dev', function (done) {
            const input = '1.2.3-dev.45'
            const expected = '0.123.45'
            const result = API.stringifyVersion(input)
            assert.strictEqual(result, expected)
            done()
        })
    })

    it('NRCHKB Info API', function (done) {
        helper
            .load([nrchkb], [], function () {
                const xyzVersion = API.stringifyVersion(version)

                helper
                    .request()
                    .get('/nrchkb/info')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .then((response) => {
                        assert.deepStrictEqual(response.body, {
                            experimental: true,
                            version: xyzVersion,
                        })
                        done()
                    })
                    .catch((err) => done(err))
            })
            .catch((error: any) => {
                done(new Error(error))
            })
    })

    it('Accessory API', function (done) {
        helper
            .load([nrchkb], [], function () {
                helper
                    .request()
                    .get('/nrchkb/accessory/categories')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .then((response) => {
                        assert.deepStrictEqual(
                            response.body,
                            accessoryCategoriesResponse
                        )
                        done()
                    })
                    .catch((err) => done(err))
            })
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
