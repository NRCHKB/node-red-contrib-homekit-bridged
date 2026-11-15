const { spawnSync } = require('node:child_process')
const path = require('node:path')
const { packageManager } = require('../package.json')

// Explicit developer command: ordinary installs never run synchronization.
const root = path.resolve(__dirname, '..')
const npm = process.env.npm_execpath
if (!npm) {
    throw new Error('Run this command with npm run lockfile:sync')
}

console.log(`Synchronizing package-lock.json with ${packageManager}`)
const result = spawnSync(
    process.execPath,
    [
        npm,
        'exec',
        '--yes',
        '--package',
        packageManager,
        '--',
        'npm',
        'install',
        '--package-lock-only',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
    ],
    { cwd: root, stdio: 'inherit', env: process.env }
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
