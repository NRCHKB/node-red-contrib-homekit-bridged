import {Red} from "node-red";
import * as HapNodeJS from "hap-nodejs"
import express from 'express'

module.exports = function(RED: Red) {
    const debug = require('debug')('NRCHKB')

    // Service API response data
    let serviceData: {
        [key: string]: HapNodeJS.SerializedService
    } = {}

    // Service API
    const _initServiceAPI = function() {
        debug('Initialize ServiceAPI')

        Object.values(HapNodeJS.Service)
            .filter(service => service.prototype instanceof HapNodeJS.Service)
            .map(service => {
                const newService = HapNodeJS.Service.serialize(new service())
                newService.displayName = service.name
                return newService
            })
            .sort((a, b) => {
                if(a.displayName < b.displayName) return -1;
                if(a.displayName > b.displayName) return 1;
                return 0;
            })
            .forEach(serialized => serviceData[serialized.displayName] = serialized)

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/homekit/service/types',
            RED.auth.needsPermission('homekit.read'),
            (_req: express.Request, res: express.Response) => {
                res.json(serviceData)
            }
        )
    }

    const init = function() {
        _initServiceAPI()
    }

    return {
        init: init,
        _: {
            initServiceAPI: _initServiceAPI,
        },
    }
}
