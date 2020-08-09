import { Red } from 'node-red'
import * as path from 'path'
import { HAPStorage } from 'hap-nodejs'

const debug = require('debug')('NRCHKB')

module.exports = (RED: Red) => {
    const API = require('./lib/api')(RED)

    // Initialize our storage system
    if (RED.settings.available()) {
        debug('RED settings available')
        const hapStoragePath = path.resolve(RED.settings.userDir, 'homekit-persist')
        HAPStorage.setCustomStoragePath(hapStoragePath)
        debug('HAPStorage path set to ', hapStoragePath)
    } else {
        debug('RED settings not available')
    }

    // Initialize API
    API.init()
}
