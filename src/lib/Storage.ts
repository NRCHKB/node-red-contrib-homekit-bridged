import path from 'node:path'
import type {
    CharacteristicEventTypes,
    SerializedAccessory,
    SerializedService,
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import storage, { type InitOptions } from 'node-persist'
import {
    validate as uuidValidate,
    version as uuidVersion,
    v4 as uuidv4,
} from 'uuid'

import NRCHKBError from './NRCHKBError'
import type { SerializedHostType } from './types/storage/SerializedHostType'
import { StorageType } from './types/storage/StorageType'

type EventCallback = {
    event: CharacteristicEventTypes
    callback: (value?: any) => void
}

type CallbackEntry = {
    eventCallback: EventCallback
    timeoutHandle: NodeJS.Timeout
}

export class Storage {
    private static customStoragePath: string
    private static storageInitialized = false

    private static memoryStorage = new Map<string, CallbackEntry>()
    private static readonly MAX_CALLBACKS = 1000

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

        // Warn if callback storage is approaching capacity
        const currentSize = Storage.memoryStorage.size
        if (currentSize >= Storage.MAX_CALLBACKS) {
            Storage.log.debug(
                `Callback storage at maximum capacity (${currentSize}/${Storage.MAX_CALLBACKS}). Dropping oldest callbacks.`
            )
            // Remove oldest callbacks to prevent unbounded growth
            const keysToDelete = Math.ceil(Storage.MAX_CALLBACKS * 0.1)
            const iterator = Storage.memoryStorage.keys()

            for (let index = 0; index < keysToDelete; index += 1) {
                const oldestKey = iterator.next()
                if (oldestKey.done) {
                    break
                }

                const entry = Storage.memoryStorage.get(oldestKey.value)
                if (entry) {
                    clearTimeout(entry.timeoutHandle)
                }
                Storage.memoryStorage.delete(oldestKey.value)
            }
        }

        const timeoutHandle = setTimeout(() => {
            // HAP-NodeJS will complain about slow running get handlers after 3 seconds
            // and terminate the request after 10 seconds.
            const entry = Storage.memoryStorage.get(callbackID)
            if (entry) {
                Storage.log.debug(`Callback ${callbackID} timeout`)
                Storage.memoryStorage.delete(callbackID)
                entry.eventCallback.callback()
            }
        }, ttl)

        Storage.memoryStorage.set(callbackID, {
            eventCallback,
            timeoutHandle,
        })

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
        const entry = Storage.memoryStorage.get(key)
        if (entry) {
            Storage.log.trace(`Returning callback ${key}`)
            clearTimeout(entry.timeoutHandle)
            Storage.memoryStorage.delete(key)
            return entry.eventCallback
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
