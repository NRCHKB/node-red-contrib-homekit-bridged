import * as path from 'node:path'
import { HAPStorage } from '@homebridge/hap-nodejs'
import { logger, loggerSetup } from '@nrchkb/logger'
import type { NodeAPI } from 'node-red'
import semver from 'semver'

import { Storage } from '../lib/Storage'

loggerSetup({ timestampEnabled: 'NRCHKB' })
const log = logger('NRCHKB')

if (process.env.NRCHKB_EXPERIMENTAL === 'true') {
    log.error('Experimental features enabled')
}

module.exports = (RED: NodeAPI) => {
    const minimalNodeVersion = '22.9.0'
    const nodeVersion = process.version

    if (!semver.gte(nodeVersion, minimalNodeVersion)) {
        throw RangeError(
            `Node.js version requirement not met. Required >=${minimalNodeVersion}. Installed ${nodeVersion}`
        )
    }

    log.debug(
        `Node.js version requirement met. Required >=${minimalNodeVersion}. Installed ${nodeVersion}`
    )

    let rootFolder: string

    // Initialize our storage system
    if (RED.settings.available() && RED.settings.userDir) {
        log.debug('RED settings available')
        rootFolder = RED.settings.userDir
    } else {
        log.error('RED settings not available')
        rootFolder = path.join(require('node:os').homedir(), '.node-red')
    }

    const hapStoragePath = path.resolve(rootFolder, 'homekit-persist')

    try {
        HAPStorage.setCustomStoragePath(hapStoragePath)
        log.debug(`HAPStorage path set to ${hapStoragePath}`)
    } catch (error: any) {
        log.debug('HAPStorage already initialized')
        log.error('node-red restart highly recommended')
        log.trace(error)
    }

    const API = require('../lib/api')(RED)

    Storage.init(rootFolder, 'nrchkb').then(() => {
        log.debug(`nrchkb storage path set to ${Storage.storagePath()}`)
        API.init()
    })

    log.debug('Registering nrchkb type')

    RED.nodes.registerType('nrchkb', function (this: any, config) {
        RED.nodes.createNode(this, config)
    })
}
