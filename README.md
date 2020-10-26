# node-red-contrib-homekit-bridged

## Do you need help with your setup?
Join us on our Discord server (click on the logo below)!

[![NRCHKB Discord](https://discordapp.com/api/guilds/586065987267330068/widget.png?style=banner2)](https://discord.gg/uvYac5u)

#### ⚠️ CAUTION ⚠️ 
##### Before upgrading make sure that you are using latest version of [Node-RED](https://nodered.org/docs/getting-started/local) and latest LTS version of [Node.js](https://nodejs.org/en/download/)
###### Upgrading from versions 0.X to 1.X is a breaking change, all devices will be reset in the Home app. Please review the [release notes](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/releases/tag/v1.0.1) thoroughly before updating!

## Intro

node-red-contrib-homekit-bridged (aka NRCHKB) is a Node-RED nodes pack to simulate Apple HomeKit devices. The goal is to emulate native HomeKit devices as closely as possible. We rely on community support - please read throught the README for the basics then head over to the [wiki page](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki) for details and examples. If you're still stuck please open an issue, we are glad to help.

These nodes allow the creation of fully customizable accessories for use in devices supporting [HomeKit](https://support.apple.com/en-gb/HT204893) which are iPhone, iPad, iPod touch, Apple Watch or Mac. If you can get it in Node-RED, you can get it in HomeKit. The goal of the project is to create a platform where official HomeKit hardware can be emulated as closely as possible through node red.

## Install

In favour to use NRCHKB which is Node-RED node (plugin) you need [Node.js](https://nodejs.org/en/) and [Node-RED](https://nodered.org/) itself installed.
The recommended version of Node.js is 10.x (or higher) and for Node-RED you should use the latest version. 

For instructions how to install Node-RED go [here](https://nodered.org/docs/getting-started/). 
Node.js will be installed together with Node-RED.

### Easy Install

If you have Node-RED already installed the recommended install method is to use the editor. To do this, select `Manage palette` from the Node-RED menu (top right).
Then select `Install` tab in the palette. Search for and install this node (`node-red-contrib-homekit-bridged`).

### Using NPM

To install NRCHKB node run the following command in your Node-RED user directory - typically `~/.node-red`

    npm i node-red-contrib-homekit-bridged

### Docker

You can also pull a [docker image](https://github.com/NRCHKB/node-red-contrib-homekit-docker) containing everything needed to get started, thanks to [Raymond Mouthaan](https://github.com/RaymondMouthaan).

## Nodes

### Bridge

The Bridge node is a configuration node (means it will be not visible in a flow like other nodes) which will be added from within the service node. It creates the _bridge_ that HomeKit application sees, i.e. the device that is added to the Apple Home app by the user.
All accessories behind a bridge node will be added automatically.

<details><summary>Configuration fields:</summary>
<p>

-   **Pin Code**: Specify the Pin for the pairing process.
-   **Port**: If you are behind a Firewall, you may want to specify a port. Cannot be 1880 as it is reserved for node-red. Otherwise, leave empty.
-   **Allow Insecure Request**: Should we allow insecure request? Default false.
-   **Manufacturer, Model, Serial Number**: Can be anything you want.
-   **Name**: Can be anything you want.
-   **Allow Message Passthrough**: If you allow then message from node input will be send to node output.
-   **Custom MDNS Configuration**: Check if you would like to use custom MDNS configuration.
    -   **Multicast**: Use udp multicasting. Optional. Default true.
    -   **Multicast Interface IP**: Explicitly specify a network interface. Optional. Defaults to all.
    -   **Port**: Set the udp port. Cannot be 1880 as it is reserved for node-red. Optional. Default 5353.
    -   **Multicast Address IP**: Set the udp ip. Optional.
    -   **TTL**: Set the multicast ttl. Optional.
    -   **Loopback**: Receive your own packets. Optional. Default true.
    -   **Reuse Address**: Set the reuseAddr option when creating the socket. Optional. Default true.
</details>

### Service

The Service node represents the single device you want to control or query.
Every service node can be _Parent_ or _Linked_. Each Parent service creates an individual accessory in the Home app. Linked services add additional features to their Parent service - for example adding battery status to a motion detector. See examples in the [wiki](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki) for details.

<details><summary>Configuration fields:</summary>
<p>

-   **Service Hierarchy**: Whether the service is _Parent_ or _Linked_.
    -   **Bridge**: On what bridge to host this Service and its Accessory. (Available only for Parent Service)
    -   **Accessory Category**: What kind of category is this Accessory. (Available only for Parent Service)
    -   **Parent Service**: Which Parent service the Linked service will be connected to. (Available only for Linked Service)
-   **Service**: Choose the type of Service from the list. [Services wiki](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki/Services)
-   **Topic**: An optional property that can be configured in the node or, if left blank, can be set by msg.topic.
-   **Manufacturer, Model, Serial Number**: Can be anything you want.
-   **Name**: If you intend to simulate a rocket, then why don't you call it _Rocket_.
-   **Camera Configuration**: Additional configuration for CameraControl service.
    -   **Video Processor**: Video processor used for Camera. Default is _ffmpeg_.
    -   **Source**: Camera source used for video processor. Example for ffmpeg _-re -i rtsp://192.168.0.227:8554/unicast_
    -   **Still Image Source**: Camera snapshot source used for video processor. Example for ffmpeg _-i http://faster_still_image_grab_url/this_is_optional.jpg_
    -   **Max Streams**: Maximum number of streams that will be generated for this camera, default _2_.
    -   **Max Width**: Maximum width reported to HomeKit, default _1280_.
    -   **Max Height**: Maximum height reported to HomeKit, default _720_.
    -   **Max FPS**: Maximum frame rate of the stream, default _10_.
    -   **Max Bitrate**: Maximum bit rate of the stream in kbit/s, default _300_.
    -   **Video Codec**: If you're running on a RPi with the omx version of ffmpeg installed, you can change to the hardware accelerated video codec with this option, default _libx264_.
    -   **Audio Codec**: If you're running on a RPi with the omx version of ffmpeg installed, you can change to the hardware accelerated audio codec with this option, default _libfdk_aac_.
    -   **Audio**: Can be set to true to enable audio streaming from camera. To use audio ffmpeg must be compiled with --enable-libfdk-aac, default _false_.
    -   **Packet Size**: If audio or video is choppy try a smaller value, set to a multiple of 188, default _1316_.
    -   **Vertical Flip**: Flips the stream vertically, default _false_.
    -   **Horizontal Flip**: Flips the stream horizontally, default _false_.
    -   **Map Video**: Select the stream used for video, default _0:0_.
    -   **Map Audio**: Select the stream used for audio, default _0:1_.
    -   **Video Filter**: Allows a custom video filter to be passed to FFmpeg via -vf, defaults to _scale=1280:720_.
    -   **Additional Command Line**: Allows additional of extra command line options to FFmpeg, default _-tune zerolatency_.
    -   **Debug**: Show the output of ffmpeg in the log, default _false_.
    -   **Snapshot Output**: Choose how to output camera snapshot:
        -   **Disabled**: there will be no output
        -   **Path**: file will be saved and path will be send to output, _msg.payload.cameraSnapshot_ contains path value stored as a string.
        -   **Content**: file content will be send to output, _msg.payload.cameraSnapshot_ contains Buffer object {"type":"Buffer","data":[]}.
    -   **Interface Name**: Selects the IP address of a given network interface. The default is to select the first available, and that may not be the same IP address that ffmpeg will use. A mismatch will cause the iOS device to discard the video stream..
-   **Characteristic Properties**: Customise the properties of characteristics. [Characteristics wiki](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki/Characteristics)

</details>

## Input Messages

Input messages can be used to update any _Characteristic_ that the selected _Service_ provides. Simply pass the values-to-update as `msg.payload` object.

**Example**: to signal that an _Outlet_ is turned on and in use, send the following payload

```json
{
    "On": 1,
    "OutletInUse": 1
}
```

**Hint**: to find out what _Characteristics_ you can address, just send `{"foo":"bar"}` and watch debug tab in node-red ;)

## Output Messages

Output messages are in the same format as input messages. They are emitted from the node when it receives _Characteristics_ updates from a paired iOS device.

Currently, there are two main and one conditional output port for homekit-service in node-red.

1. onChange, is fired when a value has been changed, this is the most recommended to use for most cases.
2. onSet, is fired every time a value has been set (even to the same value as before), it is used to capture repeated input like Television remote buttons.
3. camera snapshot, is enabled only for CameraController Service and is used to retrieve camera snapshot data

## Supported Types

The following is a list of _Services_ that are currently supported. Check for more details on [the wiki](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki/Services).
<details><summary>Supported Services:</summary>
<p>

  - AccessControl
  - AccessoryInformation
  - AirPurifier
  - AirQualitySensor
  - BatteryService
  - CameraRTPStreamManagement
  - CarbonDioxideSensor
  - CarbonMonoxideSensor
  - ContactSensor
  - Door
  - Doorbell
  - Fan
  - Fanv2
  - FilterMaintenance
  - Faucet
  - GarageDoorOpener
  - HeaterCooler
  - HumidifierDehumidifier
  - HumiditySensor
  - IrrigationSystem
  - LeakSensor
  - LightSensor
  - Lightbulb
  - LockManagement
  - LockMechanism
  - Microphone
  - MotionSensor
  - OccupancySensor
  - Outlet
  - SecuritySystem
  - ServiceLabel
  - Slat
  - SmokeSensor
  - SmartSpeaker
  - Speaker
  - StatelessProgrammableSwitch
  - Switch
  - TemperatureSensor
  - Thermostat
  - Valve
  - Window
  - WindowCovering
  - CameraOperatingMode
  - CameraEventRecordingManagement
  - WiFiRouter
  - WiFiSatellite
  - PowerManagement
  - TransferTransportManagement
  - AccessoryRuntimeInformation
  - Diagnostics
  - WiFiTransport
  - CameraControl
  - StatefulProgrammableSwitch
  - BridgeConfiguration
  - BridgingState
  - Pairing
  - ProtocolInformation
  - Relay
  - TimeInformation
  - TunneledBTLEAccessoryService
  - Television
  - InputSource
  - TelevisionSpeaker
  - TargetControlManagement
  - TargetControl
  - AudioStreamManagement
  - Siri
  - DataStreamTransportManagement
</details>

If you encounter problems with any of them please [create new Issue](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/new/choose).

If you need help with the setup itself then please write on our Discord.
 
## Context

Context info can be provided as part of the input message and will be available in the output message as `hap.context`.

**Example**:

```json
{
    "On": 1,
    "Context": "set_from_mqtt_topic"
}
```

## No Response

You can set accessory "No Response" status by sending "NO_RESPONSE" as a value for any available characteristic.

**Example**:

```json
{
    "On": "NO_RESPONSE"
}
```

After "No Response" status was triggered, the accessory is marked accordingly when you try to control it or reopen Home.app.
Any subsequent update of any characteristic value will reset this status.
However, the NO_RESPONSE status won't be visible until you exit and reopen the app. This is how the NO_RESPONSE status works in HomeKit and this behaviour can't be changed. Subsequent updates after NO_RESPONSE may also need an app restart to pick up the new state

## Topic

An optional property that can be configured in the node or, if left blank, can be set by `msg.topic`.

If Filter on Topic is selected `msg.topic` of incoming messages must match the configured value for the message to be accepted. If Filter on Topic is selected and no Topic is set on the node, then `msg.topic` must match the node's Name.

The Topic parameter can be used to filter incoming messages, making it possible to connect multiple HomeKit services to, for example, one MQTT-in node and filter directly on the MQTT Topic. It can also be used to add additional metadata to the outgoing msg, making it possible to connect multiple HomeKit services directly to an MQTT-out node or filter the flow in another way.

## FAQ

#### How can I get started?

Our [wiki page](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki) has a growing list of examples and explanations of how to use many features of these nodes. After you've gone through the wiki page and you are still having questions, please open an issue.

#### How can I upgrade from the non-bridged node-red-contrib-homekit?

[How to upgrade from node-red-homekit](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki/Upgrade-Information)

#### How can I generate Debug logs?

Stop your node-red instance and start it again using the following command:
`DEBUG=NRCHKB*,HAP-NodeJS*,Accessory,HAPServer,EventedHTTPServer node-red`

This should output detailed information regarding everything in the homekit context.

#### The same command gets sent over and over. How do I stop that?

The built in `rbe` node may be placed as needed to only pass on messages if they are different from previous messages.

#### I only want to get messages when something has been changed in the Home app, but also all messages I send into the homekit node get forwarded, too. How do I stop that?

Set Allow Message Passthrough to false in the Bridge configuration or...

Insert this node right after your homekit node:

```
[{"id":"","type":"switch","z":"","name":"check hap.context","property":"hap.context","propertyType":"msg","rules":[{"t":"nnull"}],"checkall":"true","repair":false,"outputs":1,"x":0,"y":0,"wires":[]}]
```

This will filter out all messages with their payload property hap.context not set, which means they are events that have been sent to homekit via node-red, not via the Home app.

## Contributors

#### Big thanks to [all who have contributed to the project](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/graphs/contributors).

- [Shaquu](https://github.com/Shaquu) - leading the current efforts to fix bugs and add features
- [crxporter](https://github.com/crxporter) - a lot of work on the documentation and new features design
- [Oliver Rahner](https://github.com/oliverrahner) - reworked the code to add a bridged mode - [read his story](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/wiki/Credits#oliver-rahner-explains-his-work)
- [Marius Schmeding](https://github.com/mschm/node-red-contrib-homekit) - original implementation of HAP-NodeJS into Node-RED

Also, thanks to creators of [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) - NodeJS implementation of Apple's HomeKit Accessory Server

## Contact us

 - [Our Discord server](https://discord.gg/uvYac5u) [![NRCHKB Discord](https://img.shields.io/discord/586065987267330068.svg?label=Discord)](https://discord.gg/amwV5tq)
 - [Mail directly to Shaquu](mailto:shaquu.github@gmail.com?subject=[NRCHKB])

##
[![Build Status](https://travis-ci.org/NRCHKB/node-red-contrib-homekit-bridged.svg?branch=master)](https://travis-ci.org/NRCHKB/node-red-contrib-homekit-bridged) [![codebeat badge](https://codebeat.co/badges/3bbdea35-c2ab-4273-b5d7-de6c4c9c1971)](https://codebeat.co/projects/github-com-nrchkb-node-red-contrib-homekit-bridged-master) [![Known Vulnerabilities](https://snyk.io/test/github/NRCHKB/node-red-contrib-homekit-bridged/badge.svg?targetFile=package.json)](https://snyk.io/test/github/NRCHKB/node-red-contrib-homekit-bridged?targetFile=package.json)
