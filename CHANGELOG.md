# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.2] - 2019.10.13
### Added
 - Added greenkeeper
### Changed
 - Updated README
### Fixed
 - Revert hap.context in output


## [0.7.1] - 2019.10.13
### Fixed
 - Added labels to node outputs as there are new output for camera snapshot

## [0.7.0] - 2019.10.12
### Added
 - CHANGELOG page introduction
 - travis autodeploy to npm on pushed tags
 - Change from "characteristic-change" to "set" to listen to HAP-NodeJS events
 - Sorted Service Type list in UI
 - Camera support (RTSP, Video Doorbell and others)
 - RemoteKey value now appears in node output!
 - HAP-NodeJS version changed to latest (0.5.0)
 - Added Accessory Category field for Parent Service
 - More code refactoring
 - Newest HomeKit Docs uploaded
 - Security hints
 - And more...
### Changed
 - MIT license
 - Better node-red tests
 - Pretiefied and linted code!
 - Support for node 8 and 10 only
 - Github Actions for automatic tests and publish
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
 - Fix: "Error: This callback function has already been called by someone else..." [#66](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/66)


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
