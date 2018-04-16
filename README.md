node-red-contrib-homekit-bridged
================================

Node-RED nodes to simulate Apple HomeKit devices.

## Why this fork?

As Marius Schmeding seems to have abandoned his great [work](https://github.com/mschm/node-red-contrib-homekit), I decided to fork his repo and to introduce some major rework.

The biggest change is the use of HAP-NodeJS in **bridged mode**: only add one bridge in the iOS home app to access all your devices!

Unfortunately, I had to introduce a new node type `homekit-bridge` and remove the old `homekit-accessory`. This means you either have to start over with a new flow or edit it manually.

If you go for the manual way:

* export your flow
* remove the node(s) of type `homekit-accessory`
* remove the parameter `accessory` on all of your `homekit-service`s
* import your flow
* add a new bridge and change all your services to use it

## Prerequisites

These nodes are based on the *extremely* **awesome** [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) -Project which uses an implementation of mdns to provide Bonjour / Avahi capability.
Please refer to the HAP-NodeJS [Wiki](https://github.com/KhaosT/HAP-NodeJS/wiki) and to [mdns](https://www.npmjs.com/package/mdns) for install instructions, if you get stuck on the following.

## Install

For Debian / Ubuntu you need to install the following in order to support Bonjour / Avahi

        sudo apt-get install libavahi-compat-libdnssd-dev

Then run the following command in your Node-RED user directory - typically `~/.node-red`

        npm install node-red-contrib-homekit

## Docker

If you have a beautiful solution to run this in Docker, please share :)

Related Issue: [#8](https://github.com/mschm/node-red-contrib-homekit/issues/8)

## Nodes

### Accessory

The Accessory node is a configuration node, specifying the *device* that iOS sees.

* **Pin Code**: Specify the Pin for the pairing process.
* **Port**: If you are behind a Firewall, you may want to specify a port. Otherwise leave empty.
* **Manufacturer, Model, Serial Number**: Can be anything you want.
* **Name**: If you intend to simulate a rocket, then why don't you call it *Rocket*.

*Bridged Accessories* are not supported at the moment.

### Service

The Service nodes add functionality to your Accessories. You can assign multiple Services to one Accessory.

* **Accessory**: What Accessory this Service is for.
* **Service**: Choose the type of Service from the list.
* **Name**: *optional*
* **Characteristic Properties**: Customise the properties of characteristics.

## Input Messages

Input messages can be used to update any *Characteristic* that the selected *Service* provides. Simply pass the values-to-update as `msg.payload` object.

**Example**: to signal that an *Outlet* is turned on and in use, send the following payload

```json
{
    "On": 1,
    "OutletInUse": 1
}
```
**Hint**: to find out what *Characteristics* you can address, just send `{"foo":"bar"}` and watch the debug tab ;)

## Output Messages

Output messages are in the same format as input messages. They are emitted from the node when it receives *Characteristics* updates from a paired iOS device.

## Supported Types

The following is a list of *Services* that are currently supported. If you encounter problems with any of them please file an Issue.

*   Air Quality Sensor
*   Battery Service
*   Camera Control
*   Camera RTP Stream Management
*   Carbon Dioxide Sensor
*   Carbon Monoxide Sensor
*   Contact Sensor
*   Door
*   Doorbell
*   Fan
*   Garage Door Opener
*   Humidity Sensor
*   Leak Sensor
*   Light Sensor
*   Lightbulb
*   Lock Management
*   Lock Mechanism
*   Microphone
*   Motion Sensor
*   Occupancy Sensor
*   Outlet
*   Relay
*   Security System
*   Smoke Sensor
*   Speaker
*   Stateful Programmable Switch
*   Stateless Programmable Switch
*   Switch
*   Temperature Sensor
*   Thermostat
*   Time Information
*   Window
*   Window Covering


## Context

Context info can be provided as part of the input message and will be available in the output message as `hap.context`.

**Example**:

```json
{
    "On": 1,
    "Context": "set_from_mqtt_topic"
}
```
