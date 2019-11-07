module.exports = function(RED) {
    ;('use strict')
    const debug = require('debug')('NRCHKB')
    const HapNodeJS = require('hap-nodejs')

    // Accessory API response data
    let accessoryData = {}

    // Service API response data
    let serviceData = {}

    // Accessory API
    const _initAccessoryAPI = function() {
        debug('Initialize AccessoryAPI')

        // Prepare Accessory data once
        const data = HapNodeJS.Accessory.Categories

        // Order by key (asc)
        Object.keys(data)
            .sort()
            .filter(x => !(parseInt(x) >= 0))
            .forEach(function(key) {
                accessoryData[key] = data[key]
            })

        // Retrieve Accessory Types
        RED.httpAdmin.get(
            '/homekit/accessory/types',
            RED.auth.needsPermission('homekit.read'),
            function(req, res) {
                res.json(accessoryData)
            }
        )
    }

    // Service API
    const _initServiceAPI = function() {
        debug('Initialize ServiceAPI')

        // Prepare Service data once
        const data = {}

        Object.keys(HapNodeJS.Service).forEach(function(key) {
            const val = HapNodeJS.Service[key]
            if (typeof val === 'function' && val.hasOwnProperty('UUID')) {
                data[key] = val.UUID
            }
        })

        // Order by key (asc)
        Object.keys(data)
            .sort()
            .forEach(function(key) {
                serviceData[key] = {
                    data: data[key],
                    category:
                        HapNodeJS.Accessory.Categories[
                            findDefaultAccessoryCategoryForService(data[key])
                        ],
                }
            })

        // Retrieve Service Types
        RED.httpAdmin.get(
            '/homekit/service/types',
            RED.auth.needsPermission('homekit.read'),
            function(req, res) {
                res.json(serviceData)
            }
        )
    }

    const findDefaultAccessoryCategoryForService = function(serviceUUID) {
        switch (serviceUUID) {
            case HapNodeJS.Service.Fan.UUID:
            case HapNodeJS.Service.Fanv2.UUID:
                return HapNodeJS.Accessory.Categories.FAN
            case HapNodeJS.Service.GarageDoorOpener.UUID:
                return HapNodeJS.Accessory.Categories.GARAGE_DOOR_OPENER
            case HapNodeJS.Service.Door.UUID:
                return HapNodeJS.Accessory.Categories.DOOR
            case HapNodeJS.Service.Lightbulb.UUID:
                return HapNodeJS.Accessory.Categories.LIGHTBULB
            case HapNodeJS.Service.LockManagement.UUID:
            case HapNodeJS.Service.LockMechanism.UUID:
                return HapNodeJS.Accessory.Categories.DOOR_LOCK
            case HapNodeJS.Service.Outlet.UUID:
                return HapNodeJS.Accessory.Categories.OUTLET
            case HapNodeJS.Service.Switch.UUID:
                return HapNodeJS.Accessory.Categories.SWITCH
            case HapNodeJS.Service.Thermostat.UUID:
                return HapNodeJS.Accessory.Categories.THERMOSTAT
            case HapNodeJS.Service.AirQualitySensor.UUID:
            case HapNodeJS.Service.CarbonDioxideSensor.UUID:
            case HapNodeJS.Service.CarbonMonoxideSensor.UUID:
            case HapNodeJS.Service.ContactSensor.UUID:
            case HapNodeJS.Service.HumiditySensor.UUID:
            case HapNodeJS.Service.LeakSensor.UUID:
            case HapNodeJS.Service.LightSensor.UUID:
            case HapNodeJS.Service.MotionSensor.UUID:
            case HapNodeJS.Service.OccupancySensor.UUID:
            case HapNodeJS.Service.SmokeSensor.UUID:
            case HapNodeJS.Service.TemperatureSensor.UUID:
                return HapNodeJS.Accessory.Categories.SENSOR
            case HapNodeJS.Service.SecuritySystem.UUID:
                return HapNodeJS.Accessory.Categories.SECURITY_SYSTEM
            case HapNodeJS.Service.Window.UUID:
                return HapNodeJS.Accessory.Categories.WINDOW
            case HapNodeJS.Service.WindowCovering.UUID:
                return HapNodeJS.Accessory.Categories.WINDOW_COVERING
            case HapNodeJS.Service.StatefulProgrammableSwitch.UUID:
            case HapNodeJS.Service.StatelessProgrammableSwitch.UUID:
                return HapNodeJS.Accessory.Categories.PROGRAMMABLE_SWITCH
            case HapNodeJS.Service.CameraControl.UUID:
            case HapNodeJS.Service.CameraRTPStreamManagement.UUID:
                return HapNodeJS.Accessory.Categories.IP_CAMERA
            case HapNodeJS.Service.Doorbell.UUID:
                return HapNodeJS.Accessory.Categories.VIDEO_DOORBELL
            case HapNodeJS.Service.AirPurifier.UUID:
            case HapNodeJS.Service.FilterMaintenance.UUID:
                return HapNodeJS.Accessory.Categories.AIR_PURIFIER
            case HapNodeJS.Service.HeaterCooler.UUID:
                return HapNodeJS.Accessory.Categories.AIR_HEATER
            case HapNodeJS.Service.HumidifierDehumidifier.UUID:
                return HapNodeJS.Accessory.Categories.AIR_HUMIDIFIER
            case HapNodeJS.Service.Television.UUID:
            case HapNodeJS.Service.TelevisionSpeaker.UUID:
            case HapNodeJS.Service.AudioStreamManagement.UUID:
            case HapNodeJS.Service.DataStreamTransportManagement.UUID:
            case HapNodeJS.Service.TargetControlManagement.UUID:
            case HapNodeJS.Service.TargetControl.UUID:
            case HapNodeJS.Service.Siri.UUID:
                return HapNodeJS.Accessory.Categories.TELEVISION
            case HapNodeJS.Service.Speaker.UUID:
                return HapNodeJS.Accessory.Categories.SPEAKER
            case HapNodeJS.Service.IrrigationSystem.UUID:
                return HapNodeJS.Accessory.Categories.SPRINKLER
            case HapNodeJS.Service.Faucet.UUID:
            case HapNodeJS.Service.Valve.UUID:
                return HapNodeJS.Accessory.Categories.FAUCET
            case HapNodeJS.Service.AccessoryInformation.UUID:
            case HapNodeJS.Service.BatteryService.UUID:
            case HapNodeJS.Service.BridgeConfiguration.UUID:
            case HapNodeJS.Service.BridgingState.UUID:
            case HapNodeJS.Service.InputSource.UUID:
            case HapNodeJS.Service.Labelv:
            case HapNodeJS.Service.Microphone.UUID:
            case HapNodeJS.Service.Pairing.UUID:
            case HapNodeJS.Service.ProtocolInformation.UUID:
            case HapNodeJS.Service.Relay.UUID:
            case HapNodeJS.Service.ServiceLabel.UUID:
            case HapNodeJS.Service.Slat.UUID:
            case HapNodeJS.Service.TimeInformation.UUID:
            case HapNodeJS.Service.TunneledBTLEAccessoryService.UUID:
            case HapNodeJS.Service.AccessoryInformation.UUID:
                return HapNodeJS.Accessory.Categories.OTHER
            default:
                console.error(
                    "ERROR: Didn't found category for service with UUID: " +
                        serviceUUID
                )
                return HapNodeJS.Accessory.Categories.OTHER
        }
    }

    // Add padStart to nodejs 7
    if (!String.prototype.padStart) {
        debug('NodeJS is <= 7 so we have to add padStart method for String')

        String.prototype.padStart = function padStart(targetLength, padString) {
            targetLength = targetLength >> 0 //truncate if number, or convert non-number to 0;
            padString = String(
                typeof padString !== 'undefined' ? padString : ' '
            )
            if (this.length >= targetLength) {
                return String(this)
            } else {
                targetLength = targetLength - this.length
                if (targetLength > padString.length) {
                    padString += padString.repeat(
                        targetLength / padString.length
                    ) //append to original to ensure we are longer than needed
                }
                return padString.slice(0, targetLength) + String(this)
            }
        }
    }

    const init = function() {
        _initAccessoryAPI()
        _initServiceAPI()
    }

    return {
        init: init,
        _: {
            initAccessoryAPI: _initAccessoryAPI,
            initServiceAPI: _initServiceAPI,
        },
    }
}
