import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

type StorageLike = {
    customCharacteristics?: unknown
}

const require = createRequire('file://' + __filename)

const buildPaths = [
    '../../../build/lib/api.js',
    '../../../build/lib/Storage.js',
    '../../../build/nodes/bridge.js',
    '../../../build/nodes/nrchkb.js',
    '../../../build/nodes/service.js',
    '../../../build/nodes/service2.js',
    '../../../build/nodes/unifi-controller.js',
    '../../../build/nodes/plugin-instance.js',
]

const storageState: StorageLike = {}
const callbackState = new Map<
    string,
    { event: string; callback: (...args: any[]) => void }
>()

const uuid4Validate = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    )

const storageMock = {
    Storage: class {
        static init() {
            return Promise.resolve({})
        }

        static storagePath() {
            return '/tmp/nrchkb-vitest'
        }

        static loadCustomCharacteristics() {
            return Promise.resolve(storageState.customCharacteristics)
        }

        static saveCustomCharacteristics(value: unknown) {
            storageState.customCharacteristics = value
            return Promise.resolve(value)
        }

        static saveCallback(eventCallback: {
            event: string
            callback: (...args: any[]) => void
        }) {
            const callbackID = randomUUID()
            callbackState.set(callbackID, eventCallback)
            return callbackID
        }

        static loadCallback(callbackID: string) {
            const callback = callbackState.get(callbackID)
            if (callback) {
                callbackState.delete(callbackID)
            }

            return callback
        }

        static uuid4Validate(value: string) {
            return uuid4Validate(value)
        }

        static load() {
            return Promise.resolve(undefined)
        }

        static save() {
            return Promise.resolve(undefined)
        }
    },
}

export function setCustomCharacteristics(value: unknown) {
    storageState.customCharacteristics = value
}

export function resetBuildNodeCache() {
    buildPaths.forEach((modulePath) => {
        try {
            delete require.cache[require.resolve(modulePath)]
        } catch {
            // Ignore missing cache entries.
        }
    })
}

export function loadBuildNodes() {
    resetBuildNodeCache()
    callbackState.clear()

    const storagePath = require.resolve('../../../build/lib/Storage.js')
    require.cache[storagePath] = {
        exports: storageMock,
        filename: storagePath,
        id: storagePath,
        loaded: true,
    } as NodeJS.Module

    return {
        bridge: require('../../../build/nodes/bridge.js'),
        nrchkb: require('../../../build/nodes/nrchkb.js'),
        service: require('../../../build/nodes/service.js'),
        service2: require('../../../build/nodes/service2.js'),
        unifiController: require('../../../build/nodes/unifi-controller.js'),
        pluginInstance: require('../../../build/nodes/plugin-instance.js'),
    }
}
