import type { NodeAPI } from 'node-red'

import {
    homebridgeCameraFfmpegPluginFactory,
    homebridgeCameraFfmpegPluginMetadata,
} from './embedded/homebridge-camera-ffmpeg'
import {
    homebridgeUniFiProtectPluginFactory,
    homebridgeUniFiProtectPluginMetadata,
} from './embedded/homebridge-unifi-protect'
import { NRCHKB_NODE_RED_PLUGIN_TYPE } from './registry'

module.exports = (RED: NodeAPI) => {
    RED.plugins.registerPlugin(homebridgeCameraFfmpegPluginMetadata.id, {
        type: NRCHKB_NODE_RED_PLUGIN_TYPE,
        metadata: homebridgeCameraFfmpegPluginMetadata,
        factory: homebridgeCameraFfmpegPluginFactory,
    })

    RED.plugins.registerPlugin(homebridgeUniFiProtectPluginMetadata.id, {
        type: NRCHKB_NODE_RED_PLUGIN_TYPE,
        metadata: homebridgeUniFiProtectPluginMetadata,
        factory: homebridgeUniFiProtectPluginFactory,
    })
}
