import { loggerSetup } from '@nrchkb/logger'
import helper from 'node-red-node-test-helper'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { version } from '../../../package.json'
import {
  accessoryCategoriesResponse,
  serviceTypesResponse
} from '../test-utils/data'

const API = require('../../../build/lib/api')()
const nrchkb = require('../../../build/nodes/nrchkb')

process.env.NRCHKB_EXPERIMENTAL = 'true'

loggerSetup({
  debugEnabled: true,
  errorEnabled: true,
  traceEnabled: false
})

describe('api', function () {
  beforeAll(function () {
    return new Promise<void>((resolve) => helper.startServer(resolve))
  })

  afterAll(function () {
    return new Promise<void>((resolve) => helper.stopServer(resolve))
  })

  afterEach(function () {
    helper.unload()
  })

  it('Service API', async function () {
    await helper.load([nrchkb], [])
    const response = await helper
      .request()
      .get('/nrchkb/service/types')
      .expect('Content-Type', /json/)
      .expect(200)
    expect(response.body).toStrictEqual(serviceTypesResponse)
  })

  describe('stringifyVersion', function () {
    it('release', function () {
      const input = '1.2.3'
      const expected = '1.2.3'
      const result = API.stringifyVersion(input)
      expect(result).toBe(expected)
    })

    it('dev', function () {
      const input = '1.2.3-dev.45'
      const expected = '0.123.45'
      const result = API.stringifyVersion(input)
      expect(result).toBe(expected)
    })
  })

  it('NRCHKB Info API', async function () {
    await helper.load([nrchkb], [])
    const xyzVersion = API.stringifyVersion(version)

    const response = await helper
      .request()
      .get('/nrchkb/info')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toStrictEqual({
      experimental: true,
      version: xyzVersion
    })
  })

  it('Accessory API', async function () {
    await helper.load([nrchkb], [])
    const response = await helper
      .request()
      .get('/nrchkb/accessory/categories')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toStrictEqual(accessoryCategoriesResponse)
  })
})
