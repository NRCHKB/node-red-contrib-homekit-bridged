node-red-contrib-homekit
========================

Node-RED Node to simulate Apple HomeKit Accessories.

Based on [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS).

# Usage

The HomeKit Node is used to create and configure virtual devices (*Accessories*) according to the HomeKit specification. 

Currently, *Accessories* can only consist of **one** *Service* (Fan, Outlet, Thermostat etc) each. You can of course create as many *Accessories* as you want.

*Bridged Accessories* are not supported at this time.

![Select a HomeKit Service](http://g.recordit.co/SDWNoaQaXo.gif)

## Creating Accessories

Choose the desired *Service* in the configuration dialog and deploy the flow. The *pinCode*, which will be needed during pairing, is being displayed underneath the Node.

## Input Messages

Input messages can be used to update any *Characteristic* that the selected *Service* provides. Simply pass the values-to-update as `msg.payload` object. 

**Example**: to signal that an *Outlet* is turned on and in use, send the following payload

```json
{
    "On": 1,
    "OutletInUse": 1
}
```
**Hint**: to find out what *Characteristics* you can address, just send a non-object-payload (e.g. a Timestamp) and watch the debug tab ;)

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