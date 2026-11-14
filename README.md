### <img src="https://avatars.githubusercontent.com/u/48475009?s=200&v=4" alt="NRCHKB Logo" height="20"/> node-red-contrib-homekit-bridged

# HomeKit all the things!

#### Do you need setup help? Have a great idea? Want to shoot the breeze with fellow users? [Join us on our Discord server!](https://discord.gg/uvYac5u)

### <img src="https://github.com/NRCHKB/NRCHKB.github.io/raw/master/static/images/presentation/demonstration.gif" alt="NRCHKB Demonstration" align="right"/> About this Contrib

This is a collection of nodes which can be used to imitate HomeKit devices inside of Node-RED. Messages coming into these nodes are able to set device states and status in Apple's iOS and MacOS Home apps. Commands from Home apps (or Siri) will be passed from these nodes into your Node-RED flows.

### Easy Install

Requires Node-RED **5.0.0 or newer** and Node.js **22.20.0 or newer**.
Node.js **24** is recommended for new installations and Docker deployments.

If you have Node-RED already installed, the recommended install method is to use the editor. To do this, select `Manage palette` from the Node-RED menu (top right).
Then select `Install` tab in the palette. Search for and install this node (`node-red-contrib-homekit-bridged`).

### Docker Install

You can also pull a [docker image](https://github.com/NRCHKB/node-red-contrib-homekit-docker) containing everything needed to get started.

### Upgrading from 1.x to 2.0

**2.0 is a major upgrade with breaking changes.** Back up your Node-RED user directory,
including flows, credentials, `nrchkb`, and `homekit-persist`, before upgrading. Keep
the backup with the previous runtime/package versions if you need to roll back.

- **Runtime:** Node-RED 5.0.0+ and Node.js 22.20.0+ are required. Older Node-RED
  releases and Node.js 18/20 are no longer supported. Check the runtime inside your
  Docker container or Home Assistant add-on, not only on the host.
- **Networking:** custom mDNS settings (`customMdnsConfig` and `mdns*` fields) are
  no longer applied. Configure the Bridge or Standalone Accessory's **Bind** and
  **Advertiser** settings instead. There is no automatic equivalent for every old
  multicast option; verify discovery on your network after upgrading.
- **Cameras:** the old bundled camera implementation was replaced. `CameraControl`
  remains deprecated in legacy Service nodes; it is no longer supported in Service 2.
  Use Service 2's `Camera` service with the embedded Homebridge Camera FFmpeg plugin.
  Review the source, still-image source, FFmpeg executable, audio and video settings,
  and snapshot output wiring after migration. The legacy delegate is not feature
  equivalent: live audio is omitted and its recording path uses a test source.
  Do not rely on it for production audio or recording.
- **Service 2 messages:** event mode now emits context-originated changes and includes
  context data. Review feedback loops in flows that used experimental Service 2.
  The supplied legacy-Service migration selects `outputMode: "legacy"`, preserving
  the two output ports (three for cameras) and wires, and disables event callbacks.
  Merely changing the node type by hand does not apply these compatibility settings.
- **Wait for setup:** a host now waits for all its services to finish setup before
  publishing, so late services retain their HomeKit identity. Send setup messages to
  every service configured to wait; a missing setup message or failed service setup
  can keep the whole host unpublished.
- **Characteristic metadata:** HAP-NodeJS is now `@homebridge/hap-nodejs` 2.3.0.
  Flows consuming characteristic type metadata should account for upstream changes,
  including `Camera Operating Mode Indicator` and `Manually Disabled` using numeric
  `uint8` values rather than booleans. Review custom characteristic overrides.

Existing non-camera `homekit-service` flows remain supported; migration to Service 2
is optional. Service 2 and custom characteristics no longer require
`NRCHKB_EXPERIMENTAL`. Preserve node IDs, accessory names, manufacturer, model,
serial numbers and persistence directories to retain HomeKit identity; changing
identity fields can create a replacement accessory.

To migrate an exported flow, run this from the installed package directory and
write to a separate output file (omitting the output filename overwrites the input):

```sh
npm run migrate:service2 -- flows.json flows-service2.json
```

Review the result before importing/deploying it. Restart Node-RED after upgrading,
refresh the editor, and verify pairing, Home app control, linked services, Adaptive
Lighting, cameras and a full redeploy on your installation. See the
[2.0 changelog](CHANGELOG.md#200---2026-11-14) for changes and contributor credits.

### Getting Started

[**Example flows**](https://nrchkb.github.io/wiki/examples/) For a quick start, we recommend checking out the flows which are included with the plugin, they can be imported using the Node-RED hamburger menu after install.

[**Documentation home page**](https://nrchkb.github.io/wiki/introduction/quick-start/) For more instructions, information about how things work, and detailed examples (including various real life examples from the community).

[**Discord**](https://discord.gg/uvYac5u) Again, one of us is on Discord every day, always ready to help!

### Development

See [TESTING.md](TESTING.md) for setup, type checking, behavioral tests, coverage,
mutation testing, and packaged-install checks.

<p align="center">
  <a href="https://discord.gg/uvYac5u">
    <img src="https://discordapp.com/api/guilds/586065987267330068/widget.png?style=banner2" alt="NRCHKB Discord"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/NRCHKB/node-red-contrib-homekit-bridged/actions/workflows/publish.yml">
    <img src="https://github.com/NRCHKB/node-red-contrib-homekit-bridged/actions/workflows/publish.yml/badge.svg" alt="Release publish"/>
  </a>
</p>
