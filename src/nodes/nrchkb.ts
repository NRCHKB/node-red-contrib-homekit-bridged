import { NodeAPI } from 'node-red'
import * as path from 'path'
import semver from 'semver'
import { HAPStorage } from 'hap-nodejs'
import storage from 'node-persist'

const debug = require('debug')('NRCHKB')

module.exports = (RED: NodeAPI) => {
    const requiredNodeVersion = '10.22.1'
    const nodeVersion = process.version

    if (semver.gte(nodeVersion, requiredNodeVersion)) {
        debug(
            'Node.js version requirement met. Required ' +
                requiredNodeVersion +
                '. Installed ' +
                nodeVersion
        )
    } else {
        throw new RangeError(
            'Node.js version requirement not met. Required ' +
                requiredNodeVersion +
                '. Installed ' +
                nodeVersion
        )
    }

    const API = require('../lib/api')(RED)

    // Initialize our storage system
    if (RED.settings.available() && RED.settings.userDir) {
        debug('RED settings available')

        const nrchkbStoragePath = path.resolve(RED.settings.userDir, 'nrchkb')
        storage.init({ dir: nrchkbStoragePath }).then(() => {
            // Initialize API
            API.init()
        })
        debug('nrchkbStorage path set to ', nrchkbStoragePath)

        const hapStoragePath = path.resolve(
            RED.settings.userDir,
            'homekit-persist'
        )
        HAPStorage.setCustomStoragePath(hapStoragePath)

        debug('HAPStorage path set to ', hapStoragePath)
    } else {
        throw new Error('RED settings not available')
    }

    debug('Registering nrchkb type')
    RED.nodes.registerType('nrchkb', function (this: any, config) {
        RED.nodes.createNode(this, config)
    })
}
