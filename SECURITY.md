# Security Policy

We consider security as a top priority.

If you find any vulnerability in our functionality, code or dependency then please contact us.

If you found a problem then please open new Issue [here](https://github.com/NRCHKB/node-red-contrib-homekit-bridged/issues).

If vulnerability is a serious risk then please consider contacting us directly aswell for faster response.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| >= 1.2.0  | :white_check_mark: |
| < 1.2.0   | :x: limited               |

## Reporting a Vulnerability

Contact Shaq#6198 at Discord

or find us on

[![Discord](https://img.shields.io/discord/586065987267330068.svg?label=Discord)](https://discord.gg/amwV5tq)

## Security concerns regarding usage of NRCHKB

NRCHKB is a node (plugin/library) for node-red. NRCHKB allow user to simulate HomeKit devices.

### node-red

To use node-red safely you should secure it properly with encryption and password protection - [here is how in official node-red docs](https://nodered.org/docs/security).

### Invalid Setup Codes

The following Setup Codes must not be used due to their trivial, insecure nature.
In future release (possibly 1.X.Y) they will be forbidden programmatically.

-   000-00-000
-   111-11-111
-   222-22-222
-   333-33-333
-   444-44-444
-   555-55-555
-   666-66-666
-   777-77-777
-   888-88-888
-   999-99-999
-   123-45-678
-   876-54-321

Since 1.3 random Setup Code will be generated for new Bridge nodes (instead of default 111-11-111)
