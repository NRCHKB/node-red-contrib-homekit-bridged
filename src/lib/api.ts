import { NodeAPI } from 'node-red'
import * as HapNodeJS from 'hap-nodejs'
import express from 'express'

const version = require('../../package.json').version.trim()

module.exports = function(RED: NodeAPI) {
    const debug = require('debug')('NRCHKB:api')

    // Service API response data
    const serviceData: {
        [key: string]: HapNodeJS.SerializedService
    } = {}

    // Service API
    const _initServiceAPI = () => {
        debug('Initialize ServiceAPI')

        Object.values(HapNodeJS.Service)
            .filter(service => service.prototype instanceof HapNodeJS.Service)
            .map(service => {
                const newService = HapNodeJS.Service.serialize(new service())
                newService.displayName = service.name
                return newService
            })
            .sort((a, b) => a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0)
            .forEach(serialized => serviceData[serialized.displayName] = serialized)

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/nrchkb/service/types',
            RED.auth.needsPermission('homekit.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(serviceData)
            },
        )
    }

    // NRCHKB Version API
    const _initNRCHKBVersionAPI = () => {
        debug('Initialize NRCHKBVersionAPI')

        debug('Running version:', version)

        const releaseVersionRegex = /(\d+)\.(\d+)\.(\d+)/
        const devVersionRegex = /(\d+)\.(\d+)\.(\d+)-dev\.(\d+)/

        const releaseVersionFound = releaseVersionRegex.test(version)
        const devVersionFound = devVersionRegex.test(version)

        let xyzVersion = '0.0.0'

        if (devVersionFound) {
            try {
                const match = devVersionRegex.exec(version)

                if (match) {
                    xyzVersion = 0 + '.' + match[1] + match[2] + match[3] + '.' + match[4]
                } else {
                    debug('Could not match dev version')
                }
            } catch (e) {
                console.error(e)
            }
        } else if (releaseVersionFound) {
            try {
                const match = releaseVersionRegex.exec(version)

                if (match) {
                    xyzVersion = match[0]
                } else {
                    debug('Could not match release version')
                }
            } catch (e) {
                console.error(e)
            }
        } else {
            debug('Bad version format')
            xyzVersion = '0.0.0'
        }

        debug('Evaluated as:', xyzVersion)

        // Retrieve NRCHKB version
        RED.httpAdmin.get(
            '/nrchkb/version',
            RED.auth.needsPermission('homekit.read'),
            (_req: express.Request, res: express.Response) => {
                res.json({
                    version: xyzVersion,
                })
            },
        )
    }

    const init = () => {
        _initServiceAPI()
        _initNRCHKBVersionAPI()
    }

    return {
        init: init,
    }
}
