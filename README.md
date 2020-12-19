## HomeKit all the things!

Do you need setup help? have a great idea? want to shoot the breeze with fellow users? [Join us on our Discord server!](https://discord.gg/uvYac5u)

[![NRCHKB Discord](https://discordapp.com/api/guilds/586065987267330068/widget.png?style=banner2)](https://discord.gg/uvYac5u)

# Super GIF

This is a collection of nodes which can be used to imitate HomeKit devices inside of Node-RED. Messages coming into these nodes are able to set device states and status in Apple's iOS and MacOS Home apps. Commands from Home apps (or Siri) will be passed from these nodes into your Node-RED flows.

### Easy Install

If you have Node-RED already installed, the recommended install method is to use the editor. To do this, select `Manage palette` from the Node-RED menu (top right).
Then select `Install` tab in the palette. Search for and install this node (`node-red-contrib-homekit-bridged`).

### Docker Install

You can also pull a [docker image](https://github.com/NRCHKB/node-red-contrib-homekit-docker) containing everything needed to get started, thanks to [Raymond Mouthaan](https://github.com/RaymondMouthaan).

### Getting Started

[**Example flows**](www.DuckDuckGo.com) For a quick start, we recommend checking out the flows which are included with the plugin, they can be imported using the Node-RED hamburger menu after install. 

[**Documentation home page**](https://github.com/Shaquu) For more instructions, information about how things work, and detailed examples (including various real life examples from the community)

[**Discord**](https://discord.gg/uvYac5u) Again, one of us is on Discord every day, always ready to help!

#### ⚠️ Upgrade notes
###### Before upgrading make sure that you are using latest version of [Node-RED](https://nodered.org/docs/getting-started/local) and latest LTS version of [Node.js](https://nodejs.org/en/download/)
###### Upgrading from versions 0.X to 1.X is a breaking change, all devices will be reset in the Home app. Please review the [release notes](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/releases/tag/v1.0.1) thoroughly before updating!

[![Build Status](https://travis-ci.org/NRCHKB/node-red-contrib-homekit-bridged.svg?branch=master)](https://travis-ci.org/NRCHKB/node-red-contrib-homekit-bridged) [![codebeat badge](https://codebeat.co/badges/3bbdea35-c2ab-4273-b5d7-de6c4c9c1971)](https://codebeat.co/projects/github-com-nrchkb-node-red-contrib-homekit-bridged-master) [![Known Vulnerabilities](https://snyk.io/test/github/NRCHKB/node-red-contrib-homekit-bridged/badge.svg?targetFile=package.json)](https://snyk.io/test/github/NRCHKB/node-red-contrib-homekit-bridged?targetFile=package.json)
