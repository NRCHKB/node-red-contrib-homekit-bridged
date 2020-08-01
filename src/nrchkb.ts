import { Red } from 'node-red'

module.exports = (RED: Red) => {
    const path = require('path')
    const debug = require('debug')('NRCHKB')
    const HAPStorage = require('hap-nodejs').HAPStorage
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
