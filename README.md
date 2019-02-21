# node-red-contrib-homekit-enhanced

Node-RED nodes to simulate Apple HomeKit devices. Based on node-red-contrib-homekit-bridged.

## Why this fork?

As Marius Schmeding seems to have abandoned his great [work](https://github.com/mschm/node-red-contrib-homekit) and which seems same happend to [work](https://github.com/oliverrahner/node-red-contrib-homekit-bridged) of Oliver Rahner, I decided to continue their mission to enhance homekit support on node-red.

If you come from node-red-contrib-homekit-bridged then you should not worry:

- remove node-red-contrib-homekit-bridged
- install node-red-contrib-homekit-enhanced
- that's all!

If you come from node-red-contrib-homekit then you should:

- start new flow or edit it manually
- or use [conversion script](https://github.com/flic/Convert-Flows) by [Fredrik Furtenbach](https://github.com/flic)

If you go for the manual way:

1. Export your flows.
2. Delete all flows.
3. Remove node-red-contrib-homekit.
4. Install node-red-contrib-homekit-bridged.
5. Open the exported flow in a text editor and remove the nodes of type `homekit-accessory`.
6. Remove the parameter `accessory` on all of your `homekit-service`s and save the file.
7. Import the edited flow.
8. Add a new bridge and change all your services to use it.

## Prerequisites

These nodes are based on the _extremely_ **awesome** [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) -Project which uses an implementation of mdns to provide Bonjour / Avahi capability.
Please refer to the HAP-NodeJS [Wiki](https://github.com/KhaosT/HAP-NodeJS/wiki) and to [mdns](https://www.npmjs.com/package/mdns) for install instructions, if you get stuck on the following.

## Install

For Debian / Ubuntu you need to install the following in order to support Bonjour / Avahi

        sudo apt-get install libavahi-compat-libdnssd-dev

Then run the following command in your Node-RED user directory - typically `~/.node-red`

        npm install node-red-contrib-homekit-bridged

### Docker

You can also pull a [docker image](https://hub.docker.com/r/raymondmm/node-red-homekit/) containing everything needed to get started, thanks to [raymondmm (Raymond Mouthaan)](https:/https://github.com/RaymondMouthaan).

Please see instructions on Docker Hub.

## Nodes

### Bridge

The Bridge node is a configuration node, specifying the _bridge_ that iOS sees, i.e. the device that is manually being added by the user.
All accessories behind a bridge noded are then automatically added by iOS.

- **Pin Code**: Specify the Pin for the pairing process.
- **Port**: If you are behind a Firewall, you may want to specify a port. Otherwise leave empty.
- **Manufacturer, Model, Serial Number**: Can be anything you want.
- **Name**: If you intend to simulate a rocket, then why don't you call it _Rocket_.

### Service

The Service node represents the single device you want to control or query.
Every service node creates its own HAP accessory to keep things simple

- **Bridge**: On what bridge to host this Service and its Accessory.
- **Manufacturer, Model, Serial Number**: Can be anything you want.
- **Service**: Choose the type of Service from the list.
- **Name**: _optional_
- **Characteristic Properties**: Customise the properties of characteristics.

## Input Messages

Input messages can be used to update any _Characteristic_ that the selected _Service_ provides. Simply pass the values-to-update as `msg.payload` object.

**Example**: to signal that an _Outlet_ is turned on and in use, send the following payload

```json
{
  "On": 1,
  "OutletInUse": 1
}
```

**Hint**: to find out what _Characteristics_ you can address, just send `{"foo":"bar"}` and watch the debug tab ;)

## Output Messages

Output messages are in the same format as input messages. They are emitted from the node when it receives _Characteristics_ updates from a paired iOS device.

## Supported Types

The following is a list of _Services_ that are currently supported. If you encounter problems with any of them please file an Issue.

- Air Quality Sensor
- Battery Service
- Camera Control
- Camera RTP Stream Management
- Carbon Dioxide Sensor
- Carbon Monoxide Sensor
- Contact Sensor
- Door
- Doorbell
- Fan
- Garage Door Opener
- Humidity Sensor
- Leak Sensor
- Light Sensor
- Lightbulb
- Lock Management
- Lock Mechanism
- Microphone
- Motion Sensor
- Occupancy Sensor
- Outlet
- Relay
- Security System
- Smoke Sensor
- Speaker
- Stateful Programmable Switch
- Stateless Programmable Switch
- Switch
- Temperature Sensor
- Thermostat
- Time Information
- Window
- Window Covering

## Context

Context info can be provided as part of the input message and will be available in the output message as `hap.context`.

**Example**:

```json
{
  "On": 1,
  "Context": "set_from_mqtt_topic"
}
```

## FAQ

#### How can I generate Debug logs?

Stop your node-red instance and start it again using the following command:
`DEBUG=Accessory,HAPServer,EventedHTTPServer node-red`

This should output detailed information regarding everything in the homekit context.

#### The same command gets sent over and over. How do I stop that?

#### I only want to get messages when something has been changed in the Home app, but also all messages I send into the homekit node get forwarded, too. How do I stop that?

Insert this node right after your homekit node:

```
[{"id":"","type":"switch","z":"","name":"check hap.context","property":"hap.context","propertyType":"msg","rules":[{"t":"nnull"}],"checkall":"true","repair":false,"outputs":1,"x":0,"y":0,"wires":[]}]
```

This will filter out all messages with their payload property hap.context not set, which means they are events that have been sent to homekit via node-red, not via the Home app.
