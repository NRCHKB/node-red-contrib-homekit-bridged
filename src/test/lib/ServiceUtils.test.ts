import assert from 'assert'
import { describe, it } from 'mocha'

describe('ServiceUtils', function () {
    for (const moduleName of ['ServiceUtils', 'ServiceUtils2']) {
        it(`${moduleName} removes its camera controller on close`, function (done) {
            const cameraController = {}
            let removedController: unknown
            const node = {
                accessory: {
                    removeController(controller: unknown) {
                        removedController = controller
                    },
                },
                cameraController,
                config: { isParent: false, name: 'Test Camera' },
                service: {
                    characteristics: [],
                    optionalCharacteristics: [],
                },
            }

            const serviceUtils = require(`../../lib/utils/${moduleName}`)(node)
            serviceUtils.onClose(false, () => {
                assert.strictEqual(removedController, cameraController)
                assert.strictEqual(node.cameraController, undefined)
                done()
            })
        })
    }
})
