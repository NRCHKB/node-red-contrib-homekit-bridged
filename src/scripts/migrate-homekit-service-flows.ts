#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { migrateHomeKitServiceFlow } from '../lib/migration/HomeKitService2Migration'
import type { FlowMigrationResult } from '../lib/migration/NodeMigration'

const usage = () => {
    console.error(
        'Usage: node build/scripts/migrate-homekit-service-flows.js <flow-file.json> [output-file.json]'
    )
}

const parseFlowFile = (filePath: string): unknown => {
    const content = readFileSync(filePath, 'utf8')
    return JSON.parse(content)
}

const migrate = (flowPath: string): FlowMigrationResult => {
    const parsed = parseFlowFile(flowPath)

    if (!Array.isArray(parsed)) {
        throw new Error(
            'Flow file must contain a JSON array of Node-RED nodes.'
        )
    }

    return migrateHomeKitServiceFlow(parsed)
}

const [, , inputPath, outputPath] = process.argv

if (!inputPath) {
    usage()
    process.exitCode = 1
} else {
    try {
        const inputFile = resolve(inputPath)
        const result = migrate(inputFile)
        const destination = outputPath ? resolve(outputPath) : inputFile

        writeFileSync(
            destination,
            `${JSON.stringify(result.nodes, null, 4)}\n`,
            'utf8'
        )

        console.log(
            `Migrated ${result.migrated} homekit-service node(s), including ${result.cameraMigrated} camera node(s); skipped ${result.skipped}.`
        )
        console.log(`Wrote ${destination}`)
    } catch (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    }
}
