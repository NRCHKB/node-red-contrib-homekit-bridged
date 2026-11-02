import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { Accessory, Service, uuid } from '@homebridge/hap-nodejs'
import { CharacteristicEventTypes } from '@homebridge/hap-nodejs/dist/lib/Characteristic'
import persist from 'node-persist'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StorageType } from '../../lib/types/storage/StorageType'

const { Storage } = require('../../../build/lib/Storage')

const execFileAsync = promisify(execFile)

describe('Storage callback handling', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('cancels the timeout when a callback is loaded', () => {
        vi.useFakeTimers()

        const callback = vi.fn()
        const callbackID = Storage.saveCallback(
            {
                event: CharacteristicEventTypes.GET,
                callback,
            },
            1000
        )

        const loadedCallback = Storage.loadCallback(callbackID)

        expect(loadedCallback).toEqual({
            event: 'get',
            callback,
        })
        expect(Storage.loadCallback(callbackID)).toBeUndefined()

        vi.advanceTimersByTime(1000)

        expect(callback).not.toHaveBeenCalled()
    })

    it('invokes the callback once after the ttl expires', () => {
        vi.useFakeTimers()

        const callback = vi.fn()
        const id = Storage.saveCallback(
            {
                event: CharacteristicEventTypes.GET,
                callback,
            },
            1000
        )

        vi.advanceTimersByTime(999)
        expect(callback).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith()
        expect(Storage.loadCallback(id)).toBeUndefined()
        vi.advanceTimersByTime(10000)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('handles unknown IDs and independent callback expirations', () => {
        vi.useFakeTimers()
        expect(Storage.loadCallback('unknown')).toBeUndefined()
        const first = vi.fn()
        const second = vi.fn()
        Storage.saveCallback(
            { event: CharacteristicEventTypes.GET, callback: first },
            100
        )
        const secondId = Storage.saveCallback(
            { event: CharacteristicEventTypes.GET, callback: second },
            200
        )
        vi.advanceTimersByTime(100)
        expect(first).toHaveBeenCalledTimes(1)
        expect(second).not.toHaveBeenCalled()
        expect(Storage.loadCallback(secondId)?.callback).toBe(second)
        vi.advanceTimersByTime(200)
        expect(second).not.toHaveBeenCalled()
        expect(first).toHaveBeenCalledTimes(1)
    })

    it('rejects when a stored service is missing', async () => {
        vi.spyOn(Storage, 'load').mockResolvedValueOnce(undefined)

        await expect(Storage.loadService('missing')).rejects.toBe(
            'Service data not exists'
        )
    })

    it('rejects when a stored service is corrupted', async () => {
        vi.spyOn(Storage, 'load').mockResolvedValueOnce({ nope: true })

        await expect(Storage.loadService('corrupt')).rejects.toBe(
            'Service data corrupted'
        )
    })

    it('rejects when loading a stored service fails', async () => {
        const error = new Error('storage failed')
        vi.spyOn(Storage, 'load').mockRejectedValueOnce(error)

        await expect(Storage.loadService('broken')).rejects.toBe(error)
    })
})

describe('Storage persistence', () => {
    let directory: string | undefined
    afterEach(async () => {
        vi.restoreAllMocks()
        // Every save in this suite is awaited before removing its directory.
        if (directory) await rm(directory, { recursive: true, force: true })
        directory = undefined
    })

    it('requires initialization and resolves the configured storage path', async () => {
        vi.resetModules()
        const { Storage: isolated } = await import('../../lib/Storage')
        expect(() => isolated.storagePath()).toThrow(
            'Storage path was not initialized!'
        )
        directory = await mkdtemp(path.join(os.tmpdir(), 'nrchkb-storage-'))
        await isolated.init(directory, 'records')
        expect(isolated.storagePath()).toBe(path.join(directory, 'records'))
    })

    it('propagates read and write rejection through every caller', async () => {
        const failure = new Error('disk unavailable')
        vi.spyOn(persist, 'get').mockRejectedValue(failure)
        vi.spyOn(persist, 'set').mockRejectedValue(failure)
        for (const read of [
            Storage.loadService('x'),
            Storage.loadAccessory('x'),
            Storage.loadHost('x'),
            Storage.loadCustomCharacteristics(),
        ]) {
            await expect(read).rejects.toBe(failure)
        }
        for (const write of [
            Storage.saveService('x', {}),
            Storage.saveAccessory('x', {}),
            Storage.saveHost('x', {} as never),
            Storage.saveCustomCharacteristics([]),
        ]) {
            await expect(write).rejects.toBe(failure)
        }
    })

    it('round-trips real serialized objects in fresh processes and isolates directories', async () => {
        directory = await mkdtemp(path.join(os.tmpdir(), 'nrchkb-storage-'))
        const accessory = new Accessory(
            'Persistent Switch',
            uuid.generate('storage-test')
        )
        const service = accessory.addService(Service.Switch, 'Switch')
        service.setCharacteristic('On', true)
        const data = {
            service: Service.serialize(service),
            accessory: Accessory.serialize(accessory),
            host: { ...Accessory.serialize(accessory), _isBridge: true },
        }
        const script = `
            const { Storage } = require(process.argv[1]);
            const [directory, mode, serialized] = process.argv.slice(2);
            const keepAlive = setInterval(() => {}, 1000);
            (async () => {
                await Storage.init(directory);
                if (mode === 'write') {
                    const data = JSON.parse(serialized);
                    await Storage.saveService('same', data.service);
                    await Storage.saveAccessory('same', data.accessory);
                    await Storage.saveHost('same', data.host);
                } else {
                    console.log(JSON.stringify({
                        service: await Storage.loadService('same'),
                        accessory: await Storage.loadAccessory('same'),
                        host: await Storage.loadHost('same'),
                    }));
                }
            })().catch(error => { console.error(error); process.exitCode = 1 })
              .finally(() => clearInterval(keepAlive));
        `
        const run = (dir: string, mode: string, value = data) =>
            execFileAsync(
                process.execPath,
                [
                    '-e',
                    script,
                    path.resolve('build/lib/Storage.js'),
                    dir,
                    mode,
                    JSON.stringify(value),
                ],
                { timeout: 15000 }
            )
        const first = path.join(directory, 'first')
        const second = path.join(directory, 'second')
        await run(first, 'write')
        const otherData = {
            ...data,
            service: { ...data.service, displayName: 'Other' },
        }
        await run(second, 'write', otherData)
        expect(JSON.parse((await run(first, 'read')).stdout)).toEqual(data)
        expect(JSON.parse((await run(second, 'read')).stdout)).toEqual(
            otherData
        )
    }, 20000)

    it('rejects missing and corrupt records from disk', async () => {
        directory = await mkdtemp(path.join(os.tmpdir(), 'nrchkb-storage-'))
        await Storage.init(directory)
        await expect(Storage.loadService('missing')).rejects.toBe(
            'Service data not exists'
        )
        await Storage.save(StorageType.SERVICE, 'corrupt', { invalid: true })
        await expect(Storage.loadService('corrupt')).rejects.toBe(
            'Service data corrupted'
        )
    })
})
