import { NodeAPI } from 'node-red'
import * as path from 'path'
import semver from 'semver'
import { HAPStorage } from 'hap-nodejs'
import storage from 'node-persist'
import { logger, loggerSetup } from '@nrchkb/logger'

loggerSetup({ timestampEnabled: 'NRCHKB' })
const log = logger('NRCHKB')

if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
    log.error('Experimental features enabled')
}

module.exports = (RED: NodeAPI) => {
    const deprecatedMinimalNodeVersion = '10.22.1'
    const minimalNodeVersion = '12.0.0'
    const nodeVersion = process.version

    if (semver.gte(nodeVersion, deprecatedMinimalNodeVersion)) {
        log.debug(
            `Node.js version requirement met. Required >=${deprecatedMinimalNodeVersion}. Installed ${nodeVersion}`
        )
        if (semver.lt(nodeVersion, minimalNodeVersion)) {
            log.error(
                'Node.js version requirement met but will be deprecated in Node-RED 2.0.0'
            )
            log.error(
                `Recommended >=${minimalNodeVersion}. Installed ${nodeVersion}. Consider upgrading.`
            )
        }
    } else {
        throw RangeError(
            `Node.js version requirement not met. Required >=${deprecatedMinimalNodeVersion}. Installed ${nodeVersion}`
        )
    }

    const API = require('../lib/api')(RED)

    // Initialize our storage system
    if (RED.settings.available() && RED.settings.userDir) {
        log.debug('RED settings available')

        const nrchkbStoragePath = path.resolve(RED.settings.userDir, 'nrchkb')
        storage.init({ dir: nrchkbStoragePath }).then(() => {
            // Initialize API
            API.init()
        })
        log.debug(`nrchkbStorage path set to ${nrchkbStoragePath}`)

        const hapStoragePath = path.resolve(
            RED.settings.userDir,
            'homekit-persist'
        )

        try {
            HAPStorage.setCustomStoragePath(hapStoragePath)
            log.debug(`HAPStorage path set to ${hapStoragePath}`)
        } catch (error) {
            log.debug('HAPStorage already initialized')
            log.error('node-red restart highly recommended')
            log.trace(error)
        }
    } else {
        log.debug('RED settings not available')
    }

    // Experimental feature
    if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
        log.debug('Registering nrchkb type')

        RED.nodes.registerType('nrchkb', function (this: any, config) {
            RED.nodes.createNode(this, config)
        })
    }
}
