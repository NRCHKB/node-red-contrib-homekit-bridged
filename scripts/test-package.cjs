const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { transformSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nrchkb-package-'))
const npm = process.env.npm_execpath
assert.ok(npm, 'Run with npm run test:package')
/** @param {string[]} args @param {string} cwd */
const runNpm = (args, cwd) =>
    execFileSync(process.execPath, [npm, ...args], {
        cwd,
        encoding: 'utf8',
        timeout: 180000,
        env: { ...process.env, HUSKY: '0' },
    })
try {
    runNpm(['run', 'build'], root)
    const [packed] = JSON.parse(
        runNpm(
            [
                'pack',
                '--ignore-scripts',
                '--json',
                '--pack-destination',
                directory,
            ],
            root
        )
    )
    const manifest = require('../package.json')
    const packageRoot = path.join(directory, 'node_modules', manifest.name)
    fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ private: true })
    )
    console.log(
        runNpm(
            [
                'install',
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                '--fetch-retries=0',
                '--fetch-timeout=30000',
                path.join(directory, packed.filename),
                `node-red@${manifest.devDependencies['node-red']}`,
                `node-red-node-test-helper@${manifest.devDependencies['node-red-node-test-helper']}`,
            ],
            directory
        )
    )
    const installed = JSON.parse(
        fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
    )
    for (const entry of Object.values(installed['node-red'].nodes)) {
        assert.ok(
            fs.existsSync(path.join(packageRoot, entry)),
            `Missing runtime: ${entry}`
        )
        assert.ok(
            fs.existsSync(
                path.join(packageRoot, entry.replace(/\.js$/, '.html'))
            ),
            `Missing editor: ${entry}`
        )
    }
    for (const entry of Object.values(installed['node-red'].plugins)) {
        assert.ok(
            fs.existsSync(path.join(packageRoot, entry)),
            `Missing plugin: ${entry}`
        )
    }
    // Only the flow configuration comes from the repository. All runtime code,
    // Node-RED and HAP objects below resolve inside the clean installed project.
    fs.writeFileSync(
        path.join(directory, 'flow.cjs'),
        transformSync(
            fs.readFileSync(
                path.join(
                    root,
                    'src/test/test-utils/data/switch.service.bridge.flow.ts'
                ),
                'utf8'
            ),
            { loader: 'ts', format: 'cjs' }
        ).code
    )
    fs.copyFileSync(
        path.join(__dirname, 'package-smoke-worker.cjs'),
        path.join(directory, 'smoke.cjs')
    )
    console.log(
        execFileSync(process.execPath, ['smoke.cjs', packageRoot], {
            cwd: directory,
            encoding: 'utf8',
            timeout: 20000,
        })
    )
} finally {
    // Children have exited and flow shutdown has completed before deleting files.
    fs.rmSync(directory, { recursive: true, force: true })
}
