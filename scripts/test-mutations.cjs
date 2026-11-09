// Deliberately small, semantic mutations. Mutate only generated build files;
// source and the lockfile stay untouched. Always restore each file, even on failure.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { transformSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const vitest = path.join(root, 'node_modules/vitest/vitest.mjs')
const serviceTests = [
    'src/test/nodes/service.test.ts',
    'src/test/nodes/service2.test.ts',
]
const storageTests = ['src/test/lib/Storage.test.ts']
const adaptiveLightingTests = [
    'src/test/lib/HAPHostNode.adaptiveLighting.test.ts',
]
const lightbulbTests = ['src/test/nodes/lightbulb.test.ts']
/** @type {Array<[string, string, string | RegExp, string, string[]]>} */
const mutations = []
for (const name of ['ServiceUtils', 'ServiceUtils2']) {
    const file = `lib/utils/${name}`
    mutations.push(
        [
            file,
            'removed characteristic updates',
            /characteristic\.setValue\(normalizedValue(?:, context)?\)/g,
            'void characteristic',
            serviceTests,
        ],
        [
            file,
            'removed sends',
            /node\.send\((?:msg|\[null, msg])\)/g,
            'void node',
            serviceTests,
        ],
        [
            file,
            'bypassed topic filter',
            'node.config.filter && msg.topic !== topic',
            'false',
            serviceTests,
        ],
        [
            file,
            'bypassed reachability check',
            /\(node.parentNode \?\? node\)\.reachable/g,
            'true',
            serviceTests,
        ],
        [
            file,
            'skipped listener cleanup',
            /characteristic\.removeListener\([^\n]+\)/g,
            'void characteristic',
            serviceTests,
        ]
    )
}
mutations.push(
    [
        'lib/utils/CharacteristicUtilsBase',
        'skipped set subscription',
        "characteristic.on('set', node.onCharacteristicSet)",
        'void characteristic',
        serviceTests,
    ],
    [
        'lib/Storage',
        'callback not consumed',
        'Storage.memoryStorage.delete(key)',
        'void key',
        storageTests,
    ],
    [
        'lib/Storage',
        'expired callback retained',
        'Storage.memoryStorage.delete(callbackID)',
        'void callbackID',
        storageTests,
    ],
    [
        'lib/Storage',
        'consumed callback expires again',
        'clearTimeout(entry.timeoutHandle)\n            Storage.memoryStorage.delete(key)',
        'void entry\n            void key',
        storageTests,
    ],
    [
        'lib/HAPHostNode',
        'replaced Adaptive Lighting controllers keep running',
        'controller.disableAdaptiveLighting()',
        'void controller',
        adaptiveLightingTests,
    ],
    [
        'lib/HAPHostNode',
        'replaced Adaptive Lighting controllers keep writing storage',
        'controller.setupStateChangeDelegate(undefined)',
        'void controller',
        adaptiveLightingTests,
    ],
    [
        'lib/HAPHostNode',
        'controller storage not saved on restart',
        'this.host.controllerStorage.save()',
        'void this.host',
        adaptiveLightingTests,
    ],
    [
        'lib/HAPHostNode',
        'controller storage saved for a deleted host',
        '!removed && this.published',
        'this.published',
        adaptiveLightingTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'Adaptive Lighting controller not tracked by its host',
        /node\.hostNode\.adaptiveLightingControllers\?\.set\(\s*node\.id,\s*adaptiveLightingController\s*\)/,
        'void node',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'deleted node keeps its Adaptive Lighting controller',
        'removeAdaptiveLightingController()',
        'void node',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils2',
        'deleted node keeps its Adaptive Lighting controller',
        'ServiceUtilsLegacy.removeAdaptiveLightingController()',
        'void ServiceUtilsLegacy',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'host keeps the controller of a deleted node',
        'node.hostNode.adaptiveLightingControllers.delete(node.id)',
        'void node',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'replaced service keeps its Adaptive Lighting controller',
        'removeAdaptiveLightingController()\n            accessory.removeService(service)',
        'accessory.removeService(service)',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils2',
        'replaced service keeps its Adaptive Lighting controller',
        'ServiceUtilsLegacy.removeAdaptiveLightingController()\n            accessory.removeService(service)',
        'accessory.removeService(service)',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'controller of a deleted node stays on the accessory',
        'node.accessory.removeController(controller)',
        'void controller',
        lightbulbTests,
    ],
    [
        'lib/utils/ServiceUtils',
        'controller looked up by the closing node instead of its id',
        /node\.hostNode\?\.adaptiveLightingControllers\?\.get\(\s*node\.id\s*\)/,
        'node.adaptiveLightingController',
        lightbulbTests,
    ]
)

const reportPath = path.join(root, '.vitest', 'mutation-result.json')
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
/** @param {string[]} tests */
const run = (tests) => {
    fs.rmSync(reportPath, { force: true })
    const result = spawnSync(
        process.execPath,
        [
            vitest,
            'run',
            ...tests,
            '--reporter=json',
            `--outputFile=${reportPath}`,
        ],
        {
            cwd: root,
            encoding: 'utf8',
            timeout: 60000,
            maxBuffer: 8 * 1024 * 1024,
        }
    )
    const report = fs.existsSync(reportPath)
        ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
        : undefined
    return { ...result, report }
}
const baseline = run([
    ...serviceTests,
    ...storageTests,
    ...adaptiveLightingTests,
    ...lightbulbTests,
])
assert.equal(
    baseline.status,
    0,
    `Unmutated tests must pass first:\n${baseline.stdout}\n${baseline.stderr}`
)
let survived = 0
for (const [file, label, pattern, replacement, tests] of mutations) {
    const source = fs.readFileSync(path.join(root, 'src', `${file}.ts`), 'utf8')
    const mutated = source.replace(pattern, replacement)
    assert.notEqual(
        mutated,
        source,
        `Mutation did not match: ${file}: ${label}`
    )
    const target = path.join(root, 'build', `${file}.js`)
    const original = fs.readFileSync(target)
    try {
        fs.writeFileSync(
            target,
            transformSync(mutated, {
                loader: 'ts',
                format: 'cjs',
                platform: 'node',
            }).code
        )
        const result = run(tests)
        // Infrastructure failures and timeouts are not evidence of a killed mutation.
        assert.ifError(result.error)
        assert.ok(
            result.report?.numTotalTests > 0 &&
                (result.status === 0 || result.report.numFailedTests > 0),
            `Mutation run did not complete tests: ${result.stdout}\n${result.stderr}`
        )
        if (result.status === 0) survived++
        console.log(
            `${result.status === 0 ? 'SURVIVED' : 'KILLED'} ${file}: ${label}`
        )
        if (result.status === 0) console.error(result.stdout)
    } finally {
        fs.writeFileSync(target, original)
    }
}
assert.equal(survived, 0, `${survived} targeted mutations survived`)
console.log(`All ${mutations.length} targeted mutations killed.`)
