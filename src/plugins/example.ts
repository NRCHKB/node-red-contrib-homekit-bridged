import { NodeAPI } from 'node-red'

module.exports = (RED: NodeAPI) => {
    console.log('Loaded test-plugin/test')

    // @ts-ignore
    RED.plugins.registerPlugin('nrchkb-plugins-example', {
        type: 'nrchkb-plugins',
        onadd: function() {
            console.log('nrchkb-plugins-example.onadd called')
            RED.events.on('registry:plugin-added', function(id) {
                console.log(`nrchkb-plugins-example: plugin-added event "${id}"`)
            })
        }
    })
}
