import { logger, loggerSetup } from '@nrchkb/logger'
import { HAPStorage } from 'hap-nodejs'
import { NodeAPI } from 'node-red'
import * as path from 'path'
import semver from 'semver'

import { Storage } from '../lib/Storage'

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

    let rootFolder: string

    // Initialize our storage system
    if (RED.settings.available() && RED.settings.userDir) {
        log.debug('RED settings available')
        rootFolder = RED.settings.userDir
    } else {
        log.error('RED settings not available')
        rootFolder = path.join(require('os').homedir(), '.node-red')
    }

    Storage.init(rootFolder, 'nrchkb').then(() => {
        log.debug(`nrchkb storage path set to ${Storage.storagePath()}`)
        API.init()

        const hapStoragePath = path.resolve(rootFolder, 'homekit-persist')

        try {
            HAPStorage.setCustomStoragePath(hapStoragePath)
            log.debug(`HAPStorage path set to ${hapStoragePath}`)
        } catch (error: any) {
            log.debug('HAPStorage already initialized')
            log.error('node-red restart highly recommended')
            log.trace(error)
        }

        // Experimental feature
        if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
            log.debug('Registering nrchkb type')

            RED.nodes.registerType('nrchkb', function (this: any, config) {
                RED.nodes.createNode(this, config)
            })
        }
    })
}
