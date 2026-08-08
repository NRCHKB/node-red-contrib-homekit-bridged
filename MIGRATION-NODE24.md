# Node 24 Migration Notes

This fork replaces the legacy `hap-nodejs` dependency with `@homebridge/hap-nodejs` 2.1.6 so the package can install and run on Node.js 24.

## Supported Node.js Versions

`@homebridge/hap-nodejs` 2.1.6 declares support for Node.js 22 and 24. Because of that, this package now declares `^22 || ^24` and does not support Node.js 18 or 20 when `engine-strict` is enabled.

This change was tested with:

- Node.js 24.15.0

## Flow Compatibility

Node-RED node type names, service node names, config keys, and characteristic payload names are unchanged. Existing Switch, Television, and other non-camera flows should continue to use the same HomeKit service and characteristic behavior.

## Dependency and mDNS Notes

The package import changed from `hap-nodejs` to `@homebridge/hap-nodejs`.

HAP-NodeJS 2.x removed the old `mdns` publish option. Explicit `bind` configuration is still supported. Deprecated custom mDNS configuration is retained for compatibility, but only `mdnsInterface` or `mdnsIp` can be translated into a HAP 2.x `bind` fallback.
