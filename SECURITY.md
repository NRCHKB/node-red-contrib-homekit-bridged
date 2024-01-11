# Security Policy

We consider security as a top priority.

If you find any vulnerability in our functionality, code or dependency then please contact us.

If you found a problem then please open new
Issue [here](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues).

If vulnerability is a serious risk then please consider contacting us directly as well for faster response.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| > = 1.2.0  | :white_check_mark: |
| < 1.2.0   | :x: limited               |

## Reporting a Vulnerability

Contact Shaq#6198 at Discord

or find us on

[![Discord](https://img.shields.io/discord/586065987267330068.svg?label=Discord)](https://discord.gg/uvYac5u)

## Security concerns regarding usage of NRCHKB

NRCHKB is a node (plugin/library) for node-red. NRCHKB allow user to simulate HomeKit devices.

### node-red

To use node-red safely you should secure it properly with encryption and password protection
- [here is how in official node-red docs](https://nodered.org/docs/security).

### Invalid Setup Codes

The following Setup Codes must not be used due to their trivial, insecure nature. In future release (possibly 1.X.Y)
they will be forbidden programmatically.

- 0000-0000
- 1111-1111
- 2222-2222
- 3333-3333
- 4444-4444
- 5555-5555
- 6666-6666
- 7777-7777
- 8888-8888
- 9999-9999
- 1234-5678
- 8765-4321

Since 1.3 random Setup Code will be generated for new Bridge nodes (instead of default 1111-1111)
