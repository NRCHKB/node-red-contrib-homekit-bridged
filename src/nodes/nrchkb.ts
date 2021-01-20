import { NodeAPI } from 'node-red'
import * as path from 'path'
import semver from 'semver'
import { HAPStorage } from 'hap-nodejs'
import storage from 'node-persist'
import { logger } from '../lib/logger'

const [logDebug, logError, logTrace] = logger()

module.exports = (RED: NodeAPI) => {
    const requiredNodeVersion = '10.22.1'
    const nodeVersion = process.version

    if (semver.gte(nodeVersion, requiredNodeVersion)) {
        logDebug(
            `Node.js version requirement met. Required ${requiredNodeVersion}. Installed ${nodeVersion}`
        )
    } else {
        throw RangeError(
            `Node.js version requirement not met. Required ${requiredNodeVersion}. Installed ${nodeVersion}`
        )
    }

    const API = require('../lib/api')(RED)

    // Initialize our storage system
    if (RED.settings.available() && RED.settings.userDir) {
        logDebug('RED settings available')

        const nrchkbStoragePath = path.resolve(RED.settings.userDir, 'nrchkb')
        storage.init({ dir: nrchkbStoragePath }).then(() => {
            // Initialize API
            API.init()
        })
        logDebug(`nrchkbStorage path set to ${nrchkbStoragePath}`)

        const hapStoragePath = path.resolve(
            RED.settings.userDir,
            'homekit-persist'
        )

        try {
            HAPStorage.setCustomStoragePath(hapStoragePath)
            logDebug(`HAPStorage path set to ${hapStoragePath}`)
        } catch (error) {
            logDebug('HAPStorage already initialized')
            logError('node-red restart highly recommended')
            logTrace(error)
        }
    } else {
        logDebug('RED settings not available')
    }

    logDebug('Registering nrchkb type')
    RED.nodes.registerType('nrchkb', function (this: any, config) {
        RED.nodes.createNode(this, config)

        // @ts-ignore
        const plugins = RED.plugins.getByType('nrchkb-plugins')
        console.log('plugins', plugins)
    })
}
