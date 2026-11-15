import type { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import helper from 'node-red-node-test-helper'
import type HAPService2ConfigType from '../../lib/types/HAPService2ConfigType'
import type HAPServiceNodeType from '../../lib/types/HAPServiceNodeType'

// Serialized editor flows can contain string-valued host/audio settings.
export type TestFlowNode = helper.TestFlowsItem &
    Partial<Omit<HAPService2ConfigType, 'hostType' | 'cameraConfigAudio'>> & {
        hostType?: number | string
        cameraConfigAudio?: boolean | string
        outputs?: number
        allowMessagePassthrough?: boolean
    }

export const getServiceNode = (id: string): HAPServiceNodeType =>
    helper.getNode(id) as HAPServiceNodeType

let testUserDir: string | undefined

// node-red-node-test-helper deliberately replaces settings.available during
// load(). Restore it at the module boundary so tests use their temporary path.
export const withTestStorage =
    (nodeModule: (RED: any) => unknown) => (RED: any) => {
        RED.settings.available = () => true
        return nodeModule(RED)
    }

export function configureNodeRedTestSettings() {
    if (testUserDir) {
        rmSync(testUserDir, { force: true, recursive: true })
    }

    testUserDir = mkdtempSync(path.join(os.tmpdir(), 'nrchkb-vitest-'))

    helper.settings({
        userDir: testUserDir,
    })

    return () => {
        if (testUserDir) {
            rmSync(testUserDir, { force: true, recursive: true })
            testUserDir = undefined
        }
    }
}

export async function startNodeRedHelper() {
    await helper.startServer()
}

export async function stopNodeRedHelper() {
    await helper.stopServer()
}

export async function loadNodeRedFlow(
    nodes: unknown,
    flow: unknown,
    credentials?: Record<string, unknown>
) {
    await helper.load(nodes as never, flow as never, credentials as never)
}

export async function unloadNodeRedFlow() {
    await Promise.resolve(helper.unload())
}

export function waitForInput<T>(
    node: EventEmitter,
    timeoutMs = 3000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const onInput = (msg: T) => {
            clearTimeout(timeout)
            node.off('input', onInput)
            resolve(msg)
        }

        const timeout = setTimeout(() => {
            node.off('input', onInput)
            reject(
                new Error(
                    `Timed out waiting for node input after ${timeoutMs}ms`
                )
            )
        }, timeoutMs)

        node.on('input', onInput)
    })
}

export { helper }
