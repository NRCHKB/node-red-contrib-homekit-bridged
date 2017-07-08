node-red-contrib-homekit
========================

Node-RED nodes to simulate Apple HomeKit devices.

![Intro](http://g.recordit.co/zDBJUdAO04.gif)

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
