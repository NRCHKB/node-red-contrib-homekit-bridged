const assert = require('node:assert/strict')
const path = require('node:path')
const { createRequire } = require('node:module')
const helper = require('node-red-node-test-helper')
const packageRoot = process.argv[2]
const fromPackage = createRequire(path.join(packageRoot, 'package.json'))
const { Accessory, Bridge, Characteristic } = fromPackage(
    '@homebridge/hap-nodejs'
)
// This fixture is generated beside the worker in the temporary installation.
const { switchServiceBridgeFlow } = require(path.join(__dirname, 'flow.cjs'))
const manifest = fromPackage('./package.json')
const originals = [Accessory, Bridge].map((constructor) => [
    constructor,
    constructor.prototype.publish,
    constructor.prototype.unpublish,
])
for (const [constructor] of originals) {
    constructor.prototype.publish = async () => {}
    constructor.prototype.unpublish = async () => {}
}
const drain = () => new Promise((resolve) => setImmediate(resolve))
;(async () => {
    helper.init(require.resolve('node-red'))
    await helper.startServer()
    helper.settings({ userDir: path.join(__dirname, 'user') })
    try {
        const modules = Object.values(manifest['node-red'].nodes).map(
            (entry) => {
                const register = fromPackage('./' + entry)
                assert.equal(typeof register, 'function', entry)
                return (/** @type {import('node-red').NodeAPI} */ RED) => {
                    RED.settings.available = () => true
                    return register(RED)
                }
            }
        )
        // Plugin entry points are executable registration modules as well.
        for (const entry of Object.values(manifest['node-red'].plugins)) {
            assert.equal(typeof fromPackage('./' + entry), 'function', entry)
        }
        const { flow, serviceId } = switchServiceBridgeFlow()
        await helper.load(modules, flow)
        const node =
            /** @type {import('../src/lib/types/HAPServiceNodeType').default} */ (
                helper.getNode(serviceId)
            )
        assert.ok(node.service, 'Packaged service failed to initialize')
        /** @type {Array<Array<import('node-red').NodeMessageInFlow & {payload: {On: boolean}, hap: {reachable: boolean}}>>} */
        const ports = [[], []]
        helper
            .getNode('h1')
            .on('input', (msg) =>
                ports[0].push(
                    /** @type {(typeof ports)[number][number]} */ (msg)
                )
            )
        helper
            .getNode('h2')
            .on('input', (msg) =>
                ports[1].push(
                    /** @type {(typeof ports)[number][number]} */ (msg)
                )
            )
        node.receive({ payload: { On: true } })
        await drain()
        await drain()
        assert.equal(
            node.service.getCharacteristic(Characteristic.On).value,
            true
        )
        assert.deepEqual(
            ports.map((port) => port.length),
            [1, 1]
        )
        assert.deepEqual(ports[0][0].payload, { On: true })
        assert.equal(ports[0][0].hap.reachable, true)
        console.log(
            'Packaged node entry points, editor assets and characteristic update passed.'
        )
    } finally {
        await helper.unload()
        await helper.stopServer()
        for (const [constructor, publish, unpublish] of originals) {
            constructor.prototype.publish = publish
            constructor.prototype.unpublish = unpublish
        }
    }
})().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
