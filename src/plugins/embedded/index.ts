import { getPlugin } from '../registry'
import {
    HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID,
    registerHomebridgeCameraFfmpegPlugin,
} from './homebridge-camera-ffmpeg'
import {
    HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID,
    registerHomebridgeUniFiProtectPlugin,
} from './homebridge-unifi-protect'

export const registerEmbeddedPlugins = (): void => {
    if (!getPlugin(HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID)) {
        registerHomebridgeCameraFfmpegPlugin()
    }
    if (!getPlugin(HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID)) {
        registerHomebridgeUniFiProtectPlugin()
    }
}

export {
    createAutomaticHomebridgeCameraFfmpegPluginEntry,
    HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_ID,
    HOMEBRIDGE_CAMERA_FFMPEG_PLUGIN_NAME,
    mapLegacyCameraConfigToPluginConfig,
} from './homebridge-camera-ffmpeg'

export {
    createHomebridgeUniFiProtectCleanup,
    createHomebridgeUniFiProtectPluginEntry,
    ensureHomebridgePlatformAccessoryShape,
    HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_ID,
    HOMEBRIDGE_UNIFI_PROTECT_PLUGIN_NAME,
} from './homebridge-unifi-protect'
