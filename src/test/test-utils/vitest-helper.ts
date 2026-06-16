import type { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import helper from 'node-red-node-test-helper'

let testUserDir: string | undefined

export function configureNodeRedTestSettings() {
    if (testUserDir) {
        rmSync(testUserDir, { force: true, recursive: true })
    }

    testUserDir = mkdtempSync(path.join(os.tmpdir(), 'nrchkb-vitest-'))

    helper.settings({
        available: () => true,
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
