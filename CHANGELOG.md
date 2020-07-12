# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [x.y.z]

### Fixed
-   JS console error when opening a linked service [#278](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/278)
-   Fixed outputs number not being remembered by editor
-   Fixed saving Software Revision fo Service node
-   Fixed HAPStorage path on Windows

### Added
-   Now you can pass Service Name to Subflow Service [#298](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/298)
-   Added Firmware, Software and Hardware Revision fields to Bridge configuration

### Changed
-   Now Firmware, Software and Hardware Revision and Model fields are set by default to NRCHKB version, Manufacturer is NRCHKB by default

## [1.1.1] - 2020.06.30

### Added
-   Firmware Revision configuration option (optional) [#211](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/211)
-   Hardware and Software Revision configuration option (optional)
-   Project now support typescript!

### Fixed
-   Error status is not passed to callback when "No response" was triggered [#227](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/227) also discussed in [#185](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/185)

### Changed
-   Some README.md rework
-   Updated hap-nodejs to 0.7.3
-   Updated dependencies to latest versions
-   Moved lint-staged config to main level and added minimum nodejs version

### Removed
-   Some unused code disappeared.

## [1.0.4] - 2020.03.03

### Fixed
-   Warn when trying to deploy node without bridge or parentService attached [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214#issuecomment-594084125)
-   Additional Command Line value in Camera Control is now optional [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214#issuecomment-593736115)

## [1.0.3] - 2020.03.01

### Fixed
-   Video Filter value in Camera Control is now optional in node-red editor too [#214](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/214)

## [1.0.2] - 2020.03.01

### Added
-   Warning about lost compatibility on README page.

## [1.0.0] - 2020.02.23

Lost backward compatibility. In order to make it work read this [notice](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/163#issuecomment-590108567).

### Fixed

-   Node id macify algorithm changed [#170](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/170)
-   Corrections regarding issue [#12](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/12) so that changes can be deployed without restarting node-red
-   Automatically creating a new service and replacing the old one if the service type changed
-   Automatically replacing an accessory with a new one if the accessory information changes (e.g. Name, Manufacturer, ...)
-   Video Filter value in Camera Control is now optional [#194](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/194) (can be empty, before it was generated if was empty)
-   Removed updateReachability as it is deprecated (and doesn't make a difference)

### Added

-   After Service selection in node configuration Category will be automatically set to default for Service
-   Interface Name for Camera Service configuration
-   Support for new TV Remote services
-   Now first output is for onChange, second for onSet and third for camera snapshot. [#200](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/200)
-   Sponsor Button on repository page

### Changed

-   Accessory Category in node configuration moved under Service selection
-   Clarify NO_RESPONSE in README
-   Update node-red version in dependencies
-   Camera Service source code to match newest improvements in homebridge-camera-ffmpeg
-   Update to latest HAP-NodeJS
-   Removed unnecessary accessory category from service node
-   Removed fields Manufacturer, Serial Number and Model from linked service nodes
-   Moved eslint and prettier configuration to package.json
-   Added automatic linting on pre-commit

## [0.8.0] - 2019.10.14

### Added

-   Added greenkeeper
-   Added setting to Bidge configuration called Allow Message Passthrough

### Changed

-   Updated README

### Fixed

-   Revert hap.context in node output

## [0.7.1] - 2019.10.13

### Fixed

-   Added labels to node outputs as there are new output for camera snapshot

## [0.7.0] - 2019.10.12

### Added

-   CHANGELOG page introduction
-   travis autodeploy to npm on pushed tags
-   Change from "characteristic-change" to "set" to listen to HAP-NodeJS events
-   Sorted Service Type list in UI
-   Camera support (RTSP, Video Doorbell and others)
-   RemoteKey value now appears in node output!
-   HAP-NodeJS version changed to latest (0.5.0)
-   Added Accessory Category field for Parent Service
-   More code refactoring
-   Newest HomeKit Docs uploaded
-   Security hints
-   And more...

### Changed

-   MIT license
-   Better node-red tests
-   Pretiefied and linted code!
-   Support for node 8 and 10 only
-   Github Actions for automatic tests and publish
-   And more...

### Fixed

-   Removed read/write boundaries for Characteristics
-   And more...

## [0.6.2] - 2019.03.27

### Changed

-   Some minor changes in README

### Fixed

-   Hotfix for "NO_RESPONSE"

## [0.6.1] - 2019.03.21

### Added

-   Reintroduced DEBUG mode (DEBUG=NRCHKB node-red)

### Changed

-   Renaming organisation
-   Minor changes to process of finding Parent Service as Linked Service

### Fixed

-   Crash upon removing bridge from Home [#22](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/22)
-   Fix: "Error: This callback function has already been called by someone else..." [#66](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/66)

## [0.6.0] - 2019.03.16

### Added

-   Introduce Linked Services [#41](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/41)
-   MDNS Configuration [#44](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/44)
-   Filter on Topic
-   NO_RESPONSE trigger [#48](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/48)
-   onIdentify [#54](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/54)
-   Added automatic tests for building project, code quality and finding vulnerabilities

### Changed

-   Redesigned README
