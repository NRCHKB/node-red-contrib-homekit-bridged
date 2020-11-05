import { NodeAPI } from 'node-red'
import express from 'express'
import HapCategories from './types/HapCategories'
import { SerializedService, Service } from 'hap-nodejs'

const version = require('../../package.json').version.trim()

module.exports = function (RED: NodeAPI) {
    const debug = require('debug')('NRCHKB:api')

    // Service API response data
    const serviceData: {
        [key: string]: SerializedService
    } = {}

    // Service API
    const _initServiceAPI = () => {
        debug('Initialize ServiceAPI')

        Object.values(Service)
            .filter((service) => service.prototype instanceof Service)
            .map((service) => {
                const newService = Service.serialize(new service())
                newService.displayName = service.name
                return newService
            })
            .sort((a, b) =>
                a.displayName < b.displayName
                    ? -1
                    : a.displayName > b.displayName
                    ? 1
                    : 0
            )
            .forEach(
                (serialized) =>
                    (serviceData[serialized.displayName] = serialized)
            )

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/nrchkb/service/types',
            RED.auth.needsPermission('homekit.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(serviceData)
            }
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
                    xyzVersion =
                        0 +
                        '.' +
                        match[1] +
                        match[2] +
                        match[3] +
                        '.' +
                        match[4]
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
            }
        )
    }

    // Accessory Categories API response data
    const accessoryCategoriesData: {
        [key: number]: string
    } = {}

    // Accessory API
    const _initAccessoryAPI = function () {
        debug('Initialize AccessoryAPI')

        // Prepare Accessory data once
        Object.keys(HapCategories)
            .sort()
            .filter((x) => parseInt(x) >= 0)
            .forEach((key) => {
                const keyNumber = (key as unknown) as number
                accessoryCategoriesData[keyNumber] = HapCategories[keyNumber]
            })

        // Retrieve Accessory Types
        RED.httpAdmin.get(
            '/nrchkb/accessory/categories',
            RED.auth.needsPermission('homekit.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(accessoryCategoriesData)
            }
        )
    }

    const init = () => {
        _initServiceAPI()
        _initNRCHKBVersionAPI()
        _initAccessoryAPI()
    }

    return {
        init: init,
    }
}
