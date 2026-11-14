#### ⚠️ CAUTION ⚠️

##### This project is now based on [Node-RED 5.0](https://nodered.org/blog/2026/06/09/version-5-0-released).

##### Before upgrading, make sure that you are using Node-RED 5.x and Node.js 22.20.0 or newer.

##### Node.js 24 is recommended for new installations and Docker-based deployments.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-14

Backward compatibility was lost for custom mDNS configuration.
Legacy `CameraControl` remains available only in `homekit-service` and is deprecated. New and migrated camera flows
should use the `Camera` service in `homekit-service2` with the embedded Homebridge Camera FFmpeg plugin.
Node-RED `5.0.0` or newer and Node.js `22.20.0` or newer are now required. Node.js `24` is recommended for new
installations and Docker-based deployments.

### Added

- New camera controller API with snapshots, live streaming, and fragmented MP4 recording infrastructure.
  The legacy delegate omits live audio and records a test source; use the plugin-backed camera path and see
  the [README upgrade notes](README.md#upgrading-from-1x-to-20) for compatibility limitations.
- Service node migration support for converting legacy `homekit-service` nodes to `homekit-service2` nodes,
  including conversion of `CameraControl` to the plugin-backed `Camera` service.
- Node migration API endpoints for editor-driven and script-driven migrations:
  `POST /nrchkb/migration/node` and `POST /nrchkb/migration/flow`.
- `npm run migrate:service2` helper for migrating exported Node-RED flow files.
- Legacy output mode for migrated Service 2 nodes, preserving the previous two-output behavior and the
  three-output behavior used by `CameraControl`.
- `homekit-service2` is registered as a standard node type instead of being gated by `NRCHKB_EXPERIMENTAL`.
- Plugin registry for embedded NRCHKB integrations and future external plugins, including metadata validation,
  duplicate stable ID protection, package-scoped plugin IDs, capability flags, prerequisites, single-instance flags,
  upstream attribution metadata, and a shared editor schema for plugin-provided configuration fields.
- New `homekit-plugin-instance` config node for plugin-backed HomeKit integrations.
- Embedded `Homebridge Camera FFmpeg` plugin integration backed by
  `@homebridge-plugins/homebridge-camera-ffmpeg`, with upstream authors credited separately from the NRCHKB
  integration author.
- Embedded `Homebridge UniFi Protect` plugin integration backed by `homebridge-unifi-protect` 8.1.0, with UniFi Protect
  controller configuration and camera discovery.
  Two-way audio and HomeKit Secure Video capabilities are marked experimental in plugin metadata.
- New `homekit-unifi-controller` config node with username/password credentials, controller address, application,
  self-signed certificate, and override address settings.
- Custom `Camera` service for `homekit-service2`; selecting it automatically attaches the embedded Homebridge Camera
  FFmpeg plugin while the editor renders plugin metadata and configuration from the generic plugin metadata API.
- Plugin management UI for `homekit-service2`, with an Add plugin dialog, compatibility filtering, compact plugin
  overview, and plugin-specific editor sections rendered from registered plugin metadata.
- Advertiser recommendation API for Bridge and Standalone Accessory editors.
- Pairing QR code support for unpaired Bridge and Standalone Accessory editors
  [#67](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/67).
- Pairing state tracking for Bridge and Standalone Accessory nodes so the editor can show pairing help only when it is
  still useful.
- Node-RED editor translations for en-US, German, French, and Spanish, using per-node i18n catalogs
  [#85](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/85).
- Per-node **Log Level** settings for standard and config nodes, with scoped `inherit`, `error`, `debug`, `trace`, and
  `disabled` behavior backed by `@nrchkb/logger` [#479](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/479).
- Additional unit and integration coverage for camera delegates, custom characteristics, lightbulb flows, Service 2
  migration, plugin metadata/registry behavior, host lifecycle cleanup, service utilities, storage callbacks, HAP
  compatibility, and performance.

### Changed

- Replaced `hap-nodejs` 0.12.3 with
  [`@homebridge/hap-nodejs` 2.3.0](https://github.com/homebridge/HAP-NodeJS/releases/tag/v2.3.0) and added a local
  compatibility wrapper for HAP-NodeJS types.
- Updated the Node-RED runtime baseline to `5.0.0` or newer.
- Node.js `22.20.0` or newer is now required; Node.js `24` is recommended for new installations and Docker-based
  deployments [#578](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/578).
- Deprecated legacy `CameraControl` for `homekit-service` and removed it from the `homekit-service2` service selector.
- Made the existing custom characteristic API available without `NRCHKB_EXPERIMENTAL`
  [#52](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/52).
- Removed custom mDNS publish settings from host publishing; `bind` and the standard HAP advertiser options are now
  used instead. Legacy custom mDNS fields may still be present in old flows but are ignored by HAP-NodeJS 2.x.
- Reworked Bridge, Standalone Accessory, Service, Service 2, Status, and NRCHKB editor screens into compact
  inspector-style sections with responsive disclosure groups.
- Improved Service 2 event output to include HomeKit context data when present and to send context-originated updates.
- Changed supported characteristic tracking to use sets and shared characteristic utility behavior between Service and
  Service 2 nodes.
- Added per-host accessory lookup caching, reduced repeated characteristic traversal, and made status IDs unique
  across same-millisecond updates so one update cannot clear a newer status.
- Improved host/service lifecycle handling, including synchronous `nrchkb` registration, cleaner close/unpublish
  behavior, and node status timeout cleanup
  [#477](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/477).
- Replaced the TypeScript compiler build path with an esbuild-based build and watch workflow.
- Migrated formatting and linting from ESLint and Prettier to Biome.
- Migrated the test runner from Mocha to Vitest.
- Updated TypeScript to 7.0, Node-RED and its registry to 5.0.9, Biome, ciao, concurrently, esbuild, Vitest,
  semver, uuid, Husky, and related dependencies. TypeScript now has an explicit typecheck step; its removed legacy
  module-resolution setting is replaced with bundler resolution to match the esbuild pipeline.
- Updated `@nrchkb/logger` to `3.3.0` for scoped log-level support.
- Updated CI to run on Node.js `22`, `24`, and `26` across Ubuntu, Windows, and macOS, with `test:ci`, linting, typechecking, and
  fail-fast disabled for the matrix.
- Added coverage reporting, targeted mutation checks, packaged-install smoke tests, and testing documentation.
- Updated CodeQL, publish workflows, and security support documentation for the 2.x release line.
- Refreshed example flows for the current node definitions and updated generated editor assets.
- Updated issue templates, release-note configuration, code of conduct formatting, Git attributes/ignores
  and Husky hooks; pinned npm 10.9.4 with an explicit `lockfile:sync` helper for reproducible installs.
- Documented the upgrade procedure and compatibility changes in the README, including Service 2 context
  events and upstream camera characteristic metadata changes from boolean to `uint8`.
- Added a local release audit record and documented why mutation, build and package checks must run sequentially.

### Fixed

- Restore Service and Service 2 initialization inside subflows by correcting the subflow metadata ownership
  check, preserving the template-based accessory identity in both Bridge and Standalone Accessory modes.
- Contain FFmpeg snapshot/recording process errors, recording socket errors, throwing callback timeouts,
  rejected accessory replacement cleanup and custom-characteristic refresh failures so these failures do not
  terminate Node-RED. Close the recording listener on cleanup and bind it only to loopback; avoid sending
  a second HTTP response after a failed custom-characteristic refresh.
- Complete service shutdown safely when initialization failed before characteristic listeners were registered.
- Preserve an explicitly configured zero Adaptive Lighting temperature adjustment and improve controller logging.
- Accept HomeKit pairing PINs with or without hyphens for Bridge and Standalone Accessory nodes, preserving leading
  zeros during publishing and QR generation. Reject malformed PINs consistently and return a clear pairing API error
  [#585](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/585).
- Fixed invalid `bind` JSON handling so publishing fails cleanly instead of throwing during host publish.
- Fixed host port normalization so empty or string port values are handled consistently and port `1880` remains
  blocked because it is reserved for Node-RED.
- Fixed pending wait-for-parent timers, publish timers, characteristic listeners, identify listeners, and status
  timeouts being left behind after node close/redeploy, including nodes still waiting for a parent service or setup message.
- Wait for accessory destruction before completing service close callbacks, and complete host/service cleanup
  callbacks even when HAP unpublication or destruction fails.
- Handle synchronous and asynchronous HAP publication failures, log the error, and clear the published state.
- Return the NRCHKB storage initialization promise so startup can wait for storage and API initialization.
- Initialize HAP storage before async NRCHKB storage setup to avoid late storage-path registration.
- Fixed Bridge publishing so delayed `wait for setup` services are included before publish, preserving stable HomeKit
  identity for those services [#482](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/482).
- Fixed callback storage growth by expiring callbacks, clearing timeout handles, and pruning old callback entries at
  capacity.
- Fixed setup-message handling so malformed messages report a clear error while the node keeps waiting;
  a valid setup message removes the temporary listener and initializes the service.
- Fixed custom characteristic refresh so removed definitions are deleted and existing listeners are not duplicated.
- Fixed Adaptive Lighting being lost after a host restart (e.g. full deploy) followed by a Node-RED restart: Adaptive
  Lighting controllers of the replaced host are stopped and detached from controller storage after unpublish, and the
  storage is saved once so the new host restores complete data. A deleted Lightbulb node removes its Adaptive Lighting
  controller from the accessory, so a host that keeps running does not hold it until the next restart
  [#584](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/584). Thanks to
  [@fduch2k](https://github.com/fduch2k) for the fix and regression tests.
- Remove the old Adaptive Lighting controller when a service changes type, allowing a Lightbulb changed to another
  service type and back to regain Adaptive Lighting without restarting its Bridge or Standalone Accessory.
- Fixed Service 2 `NO_RESPONSE` handling to update reachability while writing a HomeKit-compatible characteristic
  value.
- Fixed linked Service nodes retaining stale Bridge or Standalone Accessory references after switching from parent
  service mode [#503](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/503).

### Removed

- Removed the custom mDNS utility and `BonjourMulticastOptions` type.
- Removed the legacy bundled `cameraSource` implementation in favor of the new camera controller and embedded
  Homebridge Camera FFmpeg integration.
- Removed ESLint and Prettier configuration in favor of Biome.

### Contributors and community reports

- [@Shaquu](https://github.com/Shaquu) implemented and maintained the 2.0 upgrade, integrations, editor, compatibility fixes and release tooling. See the [complete master-to-dev comparison](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/compare/master...dev) for individual commits.
- [@GogoVega](https://github.com/GogoVega) contributed synchronous node registration and macOS/async test fixes in [PR #580](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/580); [@fduch2k](https://github.com/fduch2k) reported and fixed Adaptive Lighting persistence and cleanup with real-storage regression tests in [PR #584](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/pull/584).
- Pairing PIN report and verification: [@NorthernMan54](https://github.com/NorthernMan54) ([#585](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/585)).
- Delayed setup report: [@sjorge](https://github.com/sjorge) ([#482](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/482)).
- Linked-service reference report: [@AarneAarebye](https://github.com/AarneAarebye) ([#503](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/503)).
- Redeploy/discovery report: [@lilyball](https://github.com/lilyball) ([#477](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/477)).
- Per-node logging request: [@crxporter](https://github.com/crxporter) ([#479](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/479)).
- Node.js 24 compatibility request: [@Ma5terQ](https://github.com/Ma5terQ) ([#578](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/578)).
- Custom characteristics request: [@faronov](https://github.com/faronov) ([#52](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/52)).
- Pairing QR code proposal: [@Shaquu](https://github.com/Shaquu) ([#67](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/67)).
- Internationalisation proposal: [@Shaquu](https://github.com/Shaquu) ([#85](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/85)).

Thanks also to the people who supplied discussion, diagnostics, testing or suggestions in these linked feature threads (including their earlier development):

- [#67](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/67): [@crxporter](https://github.com/crxporter), [@djiwondee](https://github.com/djiwondee), [@radokristof](https://github.com/radokristof), [@sjorge](https://github.com/sjorge), [@TheNON75](https://github.com/TheNON75).
- [#85](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/85): [@ptath](https://github.com/ptath), [@radokristof](https://github.com/radokristof), [@andreypopov](https://github.com/andreypopov).
- [#578](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/578): [@sentivfan](https://github.com/sentivfan), [@CyberChris79](https://github.com/CyberChris79), [@mrobbetts](https://github.com/mrobbetts), [@ALPF5555](https://github.com/ALPF5555), [@RK392](https://github.com/RK392), [@hsugene](https://github.com/hsugene), [@NorthernMan54](https://github.com/NorthernMan54), [@structure7](https://github.com/structure7), [@jackc94](https://github.com/jackc94), [@blackflash73](https://github.com/blackflash73).
- [#52](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/52): [@faronov](https://github.com/faronov), [@fschaefer](https://github.com/fschaefer), [@sjorge](https://github.com/sjorge), [@lslomczynski](https://github.com/lslomczynski), [@crxporter](https://github.com/crxporter), [@CaseyRo](https://github.com/CaseyRo), [@Tyraenor](https://github.com/Tyraenor), [@rufusgor](https://github.com/rufusgor), [@foorschtbar](https://github.com/foorschtbar), [@GogoVega](https://github.com/GogoVega), [@djiwondee](https://github.com/djiwondee).
- [#503](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/503): [@AarneAarebye](https://github.com/AarneAarebye), [@GogoVega](https://github.com/GogoVega).
- [#477](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/477): [@lilyball](https://github.com/lilyball).
- [#482](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/482): [@caitken-com](https://github.com/caitken-com), [@sjorge](https://github.com/sjorge).

Upstream credit remains with the authors and contributors of [HAP-NodeJS](https://github.com/homebridge/HAP-NodeJS/graphs/contributors), [Homebridge Camera FFmpeg](https://github.com/homebridge-plugins/homebridge-camera-ffmpeg/graphs/contributors) and [Homebridge UniFi Protect](https://github.com/hjdhjd/homebridge-unifi-protect/graphs/contributors). The embedded plugin metadata also exposes authors, contributors, version and license from the installed upstream packages.

## [1.7.3] - 2025-01-16

### Changed

- Updated hap-nodejs [0.12.3-beta.18 to 0.12.3](https://github.com/homebridge/HAP-NodeJS/blob/latest/CHANGELOG.md) (
  features
  and bug fixes)
- Dependencies upgrade

### Fixed

- Fix compatibility with node 22 [#568](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/568)

## [1.7.2] - 2024-10-11

### Changed

- Rename `config` to `nrchkbConfig` for isolation purpose

## [1.7.1] - 2024-09-24

### Fixed

- Fix bad listeners detachment for
  characteristics [#563](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/563)

## [1.7.0] - 2024-09-19

### Fixed

- Removed vulnerable module 'ip' [#545](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/545)
- msg.context now handled properly

### Added

- Adaptive Lighting support [#335](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues/335)
- By default, registered Eve.app Characteristics for power management - for existing setup, requires old custom
  characteristics file to be removed

### Changed

- Updated hap-nodejs [0.11.1 to 0.12.3-beta.18](https://github.com/homebridge/HAP-NodeJS/blob/latest/CHANGELOG.md) (
  features
  and bug fixes)
- Dependencies upgrade
- Node `10`, `12` and `16` no longer supported, use Node 20! Or at least 18
- Updated GitHub Actions
- Some trivial PinCodes are no longer allowed
- MDNS Configuration is now deprecated, use Bind instead

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
