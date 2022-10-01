import { logger } from '@nrchkb/logger'
import {
    CharacteristicEventTypes,
    SerializedAccessory,
    SerializedService,
} from 'hap-nodejs'
import storage, { InitOptions } from 'node-persist'
import path from 'path'
import {
    v4 as uuidv4,
    validate as uuidValidate,
    version as uuidVersion,
} from 'uuid'

import NRCHKBError from './NRCHKBError'
import { SerializedHostType } from './types/storage/SerializedHostType'
import { StorageType } from './types/storage/StorageType'

type EventCallback = {
    event: CharacteristicEventTypes
    callback: (value?: any) => void
}

export class Storage {
    private static customStoragePath: string
    private static storageInitialized = false

    private static memoryStorage: { [key: string]: any } = {}

    private static log = logger('NRCHKB', 'Storage')

    static storagePath(): string {
        if (!Storage.storageInitialized) {
            throw new NRCHKBError('Storage path was not initialized!')
        }

        return Storage.customStoragePath
    }

    static init(...storagePathSegments: string[]): Promise<InitOptions> {
        Storage.customStoragePath = path.resolve(...storagePathSegments)
        Storage.storageInitialized = true

        Storage.log.trace('Initializing')

        return storage.init({ dir: Storage.storagePath() })
    }

    static save(
        type: StorageType,
        key: string | undefined,
        value: unknown
    ): Promise<storage.WriteFileResult> {
        const itemName = key ? `${type}-${key}` : type
        Storage.log.trace(`Saving ${itemName}:${value}`)
        return storage.set(itemName, value)
    }

    static saveCallback(eventCallback: EventCallback, ttl = 10000) {
        const callbackID = uuidv4()
        Storage.memoryStorage[callbackID] = eventCallback

        setTimeout(() => {
            // HAP-NodeJS will complain about slow running get handlers after 3 seconds
            // and terminate the request after 10 seconds.
            if (callbackID in Storage.memoryStorage) {
                Storage.log.debug(`Callback ${callbackID} timeout`)
                eventCallback.callback()
                delete Storage.memoryStorage[callbackID]
            }
        }, ttl)

        return callbackID
    }

    static saveCustomCharacteristics(
        value: unknown
    ): Promise<storage.WriteFileResult> {
        return Storage.save(
            StorageType.CUSTOM_CHARACTERISTICS,
            undefined,
            value
        )
    }

    static saveService(
        key: string,
        value: unknown
    ): Promise<storage.WriteFileResult> {
        return Storage.save(StorageType.SERVICE, key, value)
    }

    static saveAccessory(
        key: string,
        value: unknown
    ): Promise<storage.WriteFileResult> {
        return Storage.save(StorageType.ACCESSORY, key, value)
    }

    static saveHost(
        key: string,
        serializedHost: SerializedHostType
    ): Promise<storage.WriteFileResult> {
        return Storage.save(StorageType.HOST, key, serializedHost)
    }

    static load(type: StorageType, key?: string): Promise<any> {
        const itemName = key ? `${type}-${key}` : type
        Storage.log.trace(`Loading ${itemName}`)
        return storage.get(itemName)
    }

    static loadCallback(key: string): EventCallback | undefined {
        if (key in Storage.memoryStorage) {
            Storage.log.trace(`Returning callback ${key}`)
            const value = Storage.memoryStorage[key]
            delete Storage.memoryStorage[key]
            return value
        }

        return undefined
    }

    static loadCustomCharacteristics(): Promise<any> {
        return Storage.load(StorageType.CUSTOM_CHARACTERISTICS)
    }

    static loadService(key: string): Promise<SerializedService> {
        return new Promise((resolve, reject) => {
            Storage.load(StorageType.SERVICE, key).then((value) => {
                if (value === undefined) {
                    reject('Service data not exists')
                } else if ('primaryService' in value) {
                    resolve(value)
                } else {
                    reject('Service data corrupted')
                }
            })
        })
    }

    static loadAccessory(key: string): Promise<SerializedAccessory> {
        return Storage.load(StorageType.ACCESSORY, key)
    }

    static loadHost(key: string): Promise<SerializedHostType> {
        return Storage.load(StorageType.HOST, key)
    }

    static uuid4Validate(uuid: string) {
        return uuidValidate(uuid) && uuidVersion(uuid) === 4
    }
}
