import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
    Accessory,
    AdaptiveLightingController,
    Characteristic,
    HAPStorage,
    Service,
    uuid,
} from '@homebridge/hap-nodejs'
import { loggerSetup } from '@nrchkb/logger'
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

const HAPHostNodeFactory = require('../../../build/lib/HAPHostNode')
const HostType = require('../../../build/lib/types/HostType').default

loggerSetup({
    debugEnabled: false,
    errorEnabled: true,
    traceEnabled: false,
})

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const bridgeConfig = {
    allowInsecureRequest: false,
    allowMessagePassthrough: true,
    accessoryCategory: 1,
    advertiser: 'bonjour-hap',
    bindType: 'str',
    bridgeName: 'Bridge',
    firmwareRev: '1.0.0',
    hardwareRev: '1.0.0',
    manufacturer: 'NRCHKB',
    model: '1.0.0',
    pinCode: '1111-1111',
    port: 51826,
    serialNo: 'serial',
    softwareRev: '1.0.0',
}

let storageDir: string

const transition = (transitionStartMillis: number) => ({
    activeTransition: {
        iid: 14,
        transitionStartMillis,
        timeMillisOffset: 0,
        transitionId: 'c4f33da9-63c9-4c0f-8b89-6c36a33eef9e',
        transitionStartBuffer: '10c979d0bd000000',
        id3: 'ec883b3f08d54f89',
        brightnessCharacteristicIID: 13,
        brightnessAdjustmentRange: {
            minBrightnessValue: 10,
            maxBrightnessValue: 100,
        },
        transitionCurve: [
            {
                temperature: 300,
                brightnessAdjustmentFactor: 0,
                transitionTime: 0,
            },
            {
                temperature: 350,
                brightnessAdjustmentFactor: 0,
                transitionTime: DAY,
            },
        ],
        updateInterval: MINUTE,
        notifyIntervalThreshold: 10 * MINUTE,
    },
})

// A Bridge node with one Lightbulb that has Adaptive Lighting enabled, wired the
// way ServiceUtils does it. Creating it twice with the same node id is what a full
// deploy does: the replacing host gets the same username and accessory UUIDs.
const createHost = (id: string) => {
    const handlers = new Map<string, (...args: any[]) => any>()
    const node = {
        error: vi.fn(),
        id,
        on: vi.fn((event: string, handler: (...args: any[]) => any) => {
            handlers.set(event, handler)
        }),
    } as Record<string, any>
    HAPHostNodeFactory(
        { nodes: { createNode: vi.fn() } },
        HostType.BRIDGE
    ).init.call(node, bridgeConfig)

    const accessory = new Accessory('Lamp', uuid.generate(`${id}:lamp`))
    const service = accessory.addService(Service.Lightbulb, 'Lamp')
    service.getCharacteristic(Characteristic.Brightness)
    service.getCharacteristic(Characteristic.ColorTemperature)
    const controller = new AdaptiveLightingController(service)
    node.host.addBridgedAccessory(accessory)
    accessory.configureController(controller)
    node.adaptiveLightingControllers.add(controller)

    const storageKey = `ControllerStorage.${node.bridgeUsername.replace(/:/g, '')}.json`

    return {
        accessory,
        controller,
        node,
        // Stores a transition on disk, as an earlier Node-RED run would have left it.
        seed: (transitionStartMillis: number) =>
            HAPStorage.storage().setItemSync(storageKey, {
                accessories: {
                    [accessory.UUID]: [
                        {
                            type: controller.controllerId(),
                            controllerData: {
                                data: transition(transitionStartMillis),
                            },
                        },
                    ],
                },
            }),
        // The controller storage part of Accessory.publish(), without the network.
        publish: () => {
            node.host.controllerStorage.load(node.bridgeUsername)
            node.published = true
        },
        restart: () => handlers.get('close')?.(false, vi.fn()),
        remove: () => handlers.get('close')?.(true, vi.fn()),
        // What a later Node-RED run would load from disk for the lamp.
        storedTransitionStart: (): number | undefined => {
            const file = path.join(storageDir, storageKey)
            if (!existsSync(file)) return undefined
            const saved = JSON.parse(readFileSync(file, 'utf8'))
            return saved.accessories[accessory.UUID]?.[0]?.controllerData?.data
                ?.activeTransition?.transitionStartMillis
        },
    }
}

const activeTransitionStart = (controller: AdaptiveLightingController) =>
    controller.serialize()?.activeTransition.transitionStartMillis

// HomeKit renews the transition shortly before its curve ends. A
// TransitionControl write replaces the active transition, stops its update timer
// and reports the change to the controller storage, which saves it 100 ms later.
const renew = (
    controller: AdaptiveLightingController,
    transitionStartMillis: number
) => {
    const internals = controller as unknown as {
        updateTimeout?: ReturnType<typeof setTimeout>
        stateChangeDelegate?: () => void
    }
    clearTimeout(internals.updateTimeout)
    controller.deserialize(transition(transitionStartMillis))
    internals.stateChangeDelegate?.()
}

describe('HAPHostNode Adaptive Lighting with HAP storage', () => {
    beforeAll(() => {
        storageDir = mkdtempSync(path.join(os.tmpdir(), 'nrchkb-al-'))
        HAPStorage.setCustomStoragePath(storageDir)
    })

    afterAll(() => {
        rmSync(storageDir, { force: true, recursive: true })
    })

    beforeEach(() => {
        vi.useFakeTimers({ now: new Date('2026-11-02T06:50:00Z') })
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('restores the transition on the replacing host before the storage was ever saved', async () => {
        const id = 'a1a1a1a1a1a1a1a1'
        const old = createHost(id)
        const start = Date.now() - HOUR
        old.seed(start)
        old.publish()
        expect(activeTransitionStart(old.controller)).toBe(start)

        await old.restart()
        const live = createHost(id)
        live.publish()

        expect(live.controller.isAdaptiveLightingActive()).toBe(true)
        expect(activeTransitionStart(live.controller)).toBe(start)
        expect(live.storedTransitionStart()).toBe(start)
    })

    it('keeps the renewed transition on disk when the transition of the replaced host ends', async () => {
        const id = 'b2b2b2b2b2b2b2b2'
        const old = createHost(id)
        old.seed(Date.now() - HOUR)
        old.publish()
        renew(old.controller, Date.now())
        await vi.advanceTimersByTimeAsync(SECOND)

        const unpublish = vi.spyOn(old.node.host, 'unpublish')
        const disable = vi.spyOn(old.controller, 'disableAdaptiveLighting')
        await old.restart()
        expect(old.controller.isAdaptiveLightingActive()).toBe(false)

        const live = createHost(id)
        live.publish()
        expect(live.controller.isAdaptiveLightingActive()).toBe(true)

        await vi.advanceTimersByTimeAsync(DAY - MINUTE)
        const renewed = Date.now()
        renew(live.controller, renewed)
        // the curve the replaced host was running ends meanwhile
        await vi.advanceTimersByTimeAsync(2 * MINUTE)

        expect(live.storedTransitionStart()).toBe(renewed)
        expect(activeTransitionStart(live.controller)).toBe(renewed)
        // the replaced controller was stopped only after unpublish, so HomeKit
        // was not told that the transition was disabled
        expect(disable).toHaveBeenCalledTimes(1)
        expect(unpublish.mock.invocationCallOrder[0]).toBeLessThan(
            disable.mock.invocationCallOrder[0]
        )
    })

    it('hands a state change still queued for saving over to the replacing host', async () => {
        const id = 'c3c3c3c3c3c3c3c3'
        const old = createHost(id)
        old.seed(Date.now() - HOUR)
        old.publish()
        const renewed = Date.now()
        renew(old.controller, renewed)

        // the deploy comes before the queued save of the renewal has run
        await old.restart()
        const live = createHost(id)
        live.publish()
        expect(activeTransitionStart(live.controller)).toBe(renewed)

        // the queued save of the replaced host runs after the replacing host loaded
        await vi.advanceTimersByTimeAsync(SECOND)
        expect(live.storedTransitionStart()).toBe(renewed)

        await vi.advanceTimersByTimeAsync(HOUR)
        const next = Date.now()
        renew(live.controller, next)
        await vi.advanceTimersByTimeAsync(SECOND)
        expect(live.storedTransitionStart()).toBe(next)
    })

    it('does not write controller storage once the host is deleted', async () => {
        const id = 'd4d4d4d4d4d4d4d4'
        const old = createHost(id)
        old.seed(Date.now() - HOUR)
        old.publish()

        const storage = HAPStorage.storage()
        const setItem = vi.spyOn(storage, 'setItemSync')
        const removeItem = vi.spyOn(storage, 'removeItemSync')
        await old.remove()
        // past the end of the transition the deleted host was running
        await vi.advanceTimersByTimeAsync(DAY)

        expect(old.controller.isAdaptiveLightingActive()).toBe(false)
        expect(setItem).not.toHaveBeenCalled()
        expect(removeItem).not.toHaveBeenCalled()
    })
})
