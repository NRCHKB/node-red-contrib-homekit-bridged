// <reference path="node-modules/@types/node-red/index.d.ts" />

import { EventEmitter } from 'events'
import { Express } from 'express'
import { Server as HttpsServer } from 'https'
import {
    NodeAPIAuth,
    NodeAPIComms,
    NodeAPILibrary,
    NodeApiLog,
    NodeAPINodes,
    NodeAPISettingsWithData,
} from '@node-red/registry'

export interface Plugin {
    type: string
    id: string
    module: string
    onadd?: () => void
}

declare module '@node-red/registry' {
    interface NodeAPIPlugins {
        getByType: (type: string) => Plugin[]
    }

    interface NodeAPI<
        TSets extends NodeAPISettingsWithData = NodeAPISettingsWithData
    > {
        nodes: NodeAPINodes
        plugins: NodeAPIPlugins
        log: NodeApiLog
        settings: TSets
        events: EventEmitter
        util: util.Util
        version(): Promise<string>
        require(id: string): any
        comms: NodeAPIComms
        library: NodeAPILibrary
        auth: NodeAPIAuth
        readonly httpNode: Express
        readonly httpAdmin: Express
        readonly server: HttpsServer
        _: util.I18nTFunction
    }
}
