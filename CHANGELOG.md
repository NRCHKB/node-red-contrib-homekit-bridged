#### ⚠️ CAUTION ⚠️

##### Before upgrading make sure that you are using the latest version of [Node-RED](https://nodered.org/docs/getting-started/local) and latest LTS version of [Node.js](https://nodejs.org/en/download/)

###### Upgrading from versions 0.X to 1.X is a breaking change, all devices will be reset in the Home app. Please review the [release notes](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/releases/tag/v1.0.1) thoroughly before updating!

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2024-02-19

### Fixed

- Bug: Cannot find module 'ip' [#545](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/545)

## [1.6.0] - 2024-01-12

### Removed

- NodeJS <12 no longer supported

### Changed

- Pin Code format for new devices changed to XXXX-XXXX
- Updated hap-nodejs to [0.11.1](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.11.1) (bug fixes)

## [1.5.0] - 2022-11-20

### Added

- Support for new advertiser [AVAHI](https://github.com/homebridge/HAP-NodeJS/pull/918)
- Support for new advertiser [RESOLVED](https://github.com/homebridge/HAP-NodeJS/pull/965)
- Added `msg.hap.reachable` parameter to get device reachable state (related to NO_RESPONSE)

### Fixed

- Accessory could not be recovered from NO_RESPONSE using single Characteristic
- Make unsupported Characteristic error more
  descriptive [#456](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/456)
- FFmpeg No such file or directory [#495](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/495)
- allChars: properties have spaces in
  names [#496](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/496)
- Wait for host to return from unpublish/destroy before exiting, set published flag on destroy
- Security system with characteristics, bad
  behaviour [#388](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/388)

### Changed

- Updated hap-nodejs to [0.9.7](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.9.7) (bug fixes)
- Updated hap-nodejs to [0.9.8](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.9.8) (bug fixes)
- Updated hap-nodejs to [0.10.0](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.10.0) (features)
- Updated hap-nodejs to [0.10.1](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.10.1) (changes)
- Updated hap-nodejs to [0.10.2](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.10.2) (bug fixes)
- Updated hap-nodejs to [0.10.3](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.10.3) (bug fixes)
- Updated hap-nodejs to [0.10.4](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.10.4) (bug fixes)
- Updated hap-nodejs to [0.11.0](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.11.0) (features and bug fixes)

## [1.4.3]

### Added

- Pass Characteristic key in event context for Service2

### Changed

- Updated hap-nodejs to [0.9.6](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.9.6) (bug fixes and security
  fixes)

## [1.4.2]

### Fixed

- Resolve issue with customCharacteristics not loading from file
- Fixed publish process

## [1.4.1]

### Fixed

- Fix readme appearance on `flows.nodered.org`

## [1.4.0]

### Fixed

- Fixed customCharacteristics incorrect refresh in UI
- Implemented static accessoryUUIDs for subflows Enables the use of nrchkb nodes in subflows with backwards
  compatibility #393 - thanks @kevinkub
- Fixed Custom MDNS Configuration not showing in UI for Standalone Accessory
- Stop components from clearing other component's node.status call
- Add missing advertiser selector in UI for Standalone Accessory
- Not naming the host node causes a crash #424
- Do not output oldValue for onSet as it does not have access to old value

### Added

- Notice during app launch: Node.js 10 will be deprecated in Node-RED 2.0.0
- Event output in Service 2 which is available in NRCHKB_EXPERIMENTAL #392 #437
- Status node to fetch Serialized Service #210
- Support for environment variables in characteristic properties #217

### Changed

- Updated hap-nodejs to [0.9.5](https://github.com/homebridge/HAP-NodeJS/releases/tag/v0.9.5) (added new iOS 15 Services
  and Characteristics)
- Updated dependencies to latest versions
- Changed `BatteryService` to `Battery` in demo examples as `BatteryService` is deprecated #381 - thanks @crxporter
- Readme rework - thanks @crxporter
- More descriptive error when incorrect Characteristic has been used in msg.payload
- Add msg.hap.allChars to service nodes #438

## [1.3.6]

### Fixed

- nrchkb complaining about validValues #52

## [1.3.5]

### Fixed

- NO_RESPONSE not working

## [1.3.4]

### Fixed

- onChange fired when value not changed #390 - thanks for reporting @Delphius7

## [1.3.3]

### Fixed

- Resolve issues with incorrect Characteristics names used in node output

## [1.3.2]

### Fixed

- Resolve issues with some Characteristics names not being accepted since hap-nodejs upgrade

## [1.3.1]

### Fixed

- Fix allowMessagePassthrough=false not working for messages from Home.app

## [1.3.0]

### Fixed

- There was a problem when mdnsConfig was
  empty [#322](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/322)
- There was a problem when NRCHKB was updated without Node-RED
  restart [#363](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/363)
- Linked service throws error during setup if parent waits for the setup message (thanks @AlexOwl)
- . in Bridge name was causing it not being published without any feedback to user

### Added

- More code tests
- Verify if Node.js version criteria is met on start
- Support fo9r Standalone Accessory mode (like in old
  times) [#310](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/310)
- (Experimental) Support for Custom
  Characteristics [#52](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/52)
- Add client IP address to onSet/onChange output
  message (`msg.hap.session`) [#328](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/328)
- As of new mdns advertiser available now there is a possibility to choose which you want to use in Bridge Config:
  ciao (
  new, improved but not yet proved) or (good old) bonjour. Default bonjour

### Changed

- Updated hap-nodejs to 0.9.4
- Updated dependencies to latest versions
- TypeScript-ify code
- Generate random pin code for new Bridge nodes

## [1.2.0] - 2020.08.16

### Fixed

- JS console error when opening a linked
  service [#278](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/278)
- Fixed outputs number not being remembered by editor
- Fixed saving Software Revision fo Service node
- Fixed HAPStorage path on Windows
- There was a translation issue, changed pilot to remote in README.

### Added

- Added Firmware, Software and Hardware Revision fields to Bridge configuration
- Now we have examples that you can import in node-red!
- You can make Service node wait for setup message.

### Changed

- Now Firmware, Software and Hardware Revision and Model fields are set by default to NRCHKB version, Manufacturer is
  NRCHKB by default
- Updated hap-nodejs to 0.7.8
- Updated dependencies to latest versions
- Disallow using port 1880 for Bridge as that port is reserved for node-red

## [1.1.1] - 2020.06.30

### Added

- Firmware Revision configuration option (
  optional) [#211](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/211)
- Hardware and Software Revision configuration option (optional)
- Project now support typescript!

### Fixed

- Error status is not passed to callback when "No response" was
  triggered [#227](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/227) also discussed
  in [#185](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/185)

### Changed

- Some README.md rework
- Updated hap-nodejs to 0.7.3
- Updated dependencies to latest versions
- Moved lint-staged config to main level and added minimum nodejs version

### Removed

- Some unused code disappeared.

## [1.0.4] - 2020.03.03

### Fixed

- Warn when trying to deploy node without bridge or parentService
  attached [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214#issuecomment-594084125)
- Additional Command Line value in Camera Control is now
  optional [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214#issuecomment-593736115)

## [1.0.3] - 2020.03.01

### Fixed

- Video Filter value in Camera Control is now optional in node-red editor
  too [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214)

## [1.0.2] - 2020.03.01

### Added

- Warning about lost compatibility on README page.

## [1.0.0] - 2020.02.23

Lost backward compatibility. In order to make it work read
this [notice](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/163#issuecomment-590108567).

### Fixed

- Node id macify algorithm changed [#170](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/170)
- Corrections regarding issue [#12](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/12) so that
  changes can be deployed without restarting node-red
- Automatically creating a new service and replacing the old one if the service type changed
- Automatically replacing an accessory with a new one if the accessory information changes (e.g., Name, Manufacturer,
  ...)
- Video Filter value in Camera Control is now
  optional [#194](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/194) (can be empty, before it was
  generated if was empty)
- Removed updateReachability as it is deprecated (and doesn't make a difference)

### Added

- After Service selection in node configuration Category will be automatically set to default for Service
- Interface Name for Camera Service configuration
- Support for new TV Remote services
- Now first output is for onChange, second for onSet and third for camera
  snapshot. [#200](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/200)
- Sponsor Button on repository page

### Changed

- Accessory Category in node configuration moved under Service selection
- Clarify NO_RESPONSE in README
- Update node-red version in dependencies
- Camera Service source code to match the newest improvements in homebridge-camera-ffmpeg
- Update to latest HAP-NodeJS
- Removed unnecessary accessory category from service node
- Removed fields Manufacturer, Serial Number and Model from linked service nodes
- Moved eslint and prettier configuration to package.json
- Added automatic linting on pre-commit

## [0.8.0] - 2019.10.14

### Added

- Added greenkeeper
- Added setting to Bridge configuration called Allow Message Passthrough

### Changed

- Updated README

### Fixed

- Revert hap.context in node output

## [0.7.1] - 2019.10.13

### Fixed

- Added labels to node outputs as there are new output for camera snapshot

## [0.7.0] - 2019.10.12

### Added

- CHANGELOG page introduction
- Change from "characteristic-change" to "set" to listen to HAP-NodeJS events
- Sorted Service Type list in UI
- Camera support (RTSP, Video Doorbell and others)
- RemoteKey value now appears in node output!
- HAP-NodeJS version changed to latest (0.5.0)
- Added Accessory Category field for Parent Service
- More code refactoring
- The Newest HomeKit Docs uploaded
- Security hints
- And more...

### Changed

- MIT license
- Better node-red tests
- Prettified and linted code!
- Support for node 8 and 10 only
- GitHub Actions for automatic tests and publish
- And more...

### Fixed

- Removed read/write boundaries for Characteristics
- And more...

## [0.6.2] - 2019.03.27

### Changed

- Some minor changes in README

### Fixed

- Hotfix for "NO_RESPONSE"

## [0.6.1] - 2019.03.21

### Added

- Reintroduced DEBUG mode (DEBUG=NRCHKB node-red)

### Changed

- Renaming organisation
- Minor changes to process of finding Parent Service as Linked Service

### Fixed

- Crash upon removing bridge from Home [#22](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/22)
- Fix: "Error: This callback function has already been called by someone
  else..." [#66](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/66)

## [0.6.0] - 2019.03.16

### Added

- Introduce Linked Services [#41](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/41)
- MDNS Configuration [#44](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/44)
- Filter on Topic
- NO_RESPONSE trigger [#48](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/48)
- onIdentify [#54](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/54)
- Added automatic tests for building project, code quality and finding vulnerabilities

### Changed

- Redesigned README
