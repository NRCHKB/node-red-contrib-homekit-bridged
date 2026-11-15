# Testing

## Setup and routine checks

Use Node.js 22.20.0 or newer and the npm version in
[`package.json`](package.json)'s `packageManager` field. CI tests Node.js 22,
24, and 26 on Linux, Windows, and macOS.

From the repository root, run:

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:ci
```

Build before running tests: several suites exercise the generated CommonJS
modules under `build/`. Vitest does not rebuild them automatically.

Run mutation checks separately from builds, watch processes, other tests and
package smoke tests. Mutations temporarily replace files under `build/`, while
`test:package` rebuilds them. Running these commands concurrently invalidates the
results. CI runs them sequentially.

| Command                 | Purpose                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | Check formatting, imports, and lint rules with Biome.                                                                                              |
| `npm run typecheck`     | Strictly check production code, tests, fixtures, scripts, and root configuration files without emitting files. JavaScript scripts are checked too. |
| `npm test`              | Run the full Vitest suite once.                                                                                                                    |
| `npm run test:ci`       | Run the suite with file parallelism disabled.                                                                                                      |
| `npm run test:watch`    | Rerun tests while editing. Rebuild when production code changes.                                                                                   |
| `npm run test:coverage` | Run tests and enforce coverage thresholds.                                                                                                         |
| `npm run test:mutation` | Check that deliberate behavioral defects make tests fail.                                                                                          |
| `npm run test:package`  | Build, pack, install, and exercise the distributable in a clean Node-RED project.                                                                  |

To run a focused suite after building:

```sh
npm exec -- vitest run src/test/nodes/service.test.ts src/test/nodes/service2.test.ts
npm exec -- vitest run src/test/lib/Storage.test.ts
```

[`tsconfig.json`](tsconfig.json) includes `src/` (including `src/test/`),
`scripts/`, and root TypeScript/JavaScript configuration files. It excludes
generated build files, coverage reports, and dependencies. `checkJs` is enabled;
use JSDoc types for JavaScript scripts. Dependency declaration files use
`skipLibCheck`.

### Dependency changes

Use the npm version pinned in `packageManager` when changing dependencies.
If you used another npm version, run `npm run lockfile:sync` afterward and commit
the resulting lockfile with your dependency changes. This preserves Node-RED's
nested TypeScript 5 optional peer while the project uses TypeScript 7.

Synchronization is an explicit developer command, implemented in
[`scripts/sync-lockfile.cjs`](scripts/sync-lockfile.cjs). It may download the
pinned npm version and needs registry access. It updates only the lockfile,
with lifecycle scripts disabled. There is no `postinstall` hook for lockfile
synchronization. CI validates the committed lockfile with `npm ci`.

## Writing behavioral tests

The shared switch suite in
[`common-switch-service-tests.ts`](src/test/test-utils/common-switch-service-tests.ts)
runs against both service implementations with real HAP services and
characteristics. Stub network publication when it is outside the test's scope.

Observe messages on downstream helpers, with a separate helper for each output.
An assertion on the service's own `input` event only verifies the injected
message. Also inspect the HAP characteristic to verify that the node processed it.
Use `handleSetRequest()` and `handleGetRequest()` for HAP writes and reads so
callback completion and communication errors pass through the real interface.

Assert payloads, topics, metadata, output ports, and exact message counts,
including zero output for rejected messages. Drain HAP promise continuations and
Node-RED's immediate delivery queue before checking counts.

The current contracts are:

- Legacy mode sends change messages on output 1 and set messages on output 2.
  Service2 event mode sends both on output 1 and identifies them with
  `hap.event.name`. Service2 legacy mode retains separate outputs.
- Each accepted set emits a set message when output is permitted. A change
  message requires a different value; repeating a value does not emit a change.
- With passthrough disabled, legacy input `Context` allows set and change output.
  Service2 retains input `Context` on changes but omits it on set events, so
  only its change message is forwarded in that case.
- Unsupported characteristics are logged and ignored while supported keys in
  the same payload are processed. Empty objects and arrays without supported
  keys produce no output. Missing, null, and primitive payloads log errors.
- `NO_RESPONSE` makes the accessory unreachable. HAP reads and writes reject
  with `SERVICE_COMMUNICATION_FAILURE`; failed writes retain the last value.
  Valid input restores reachability. Linked services share their parent's state.
  Recovery clears linked `NO_RESPONSE` statuses without clearing unrelated ones.
- Reloading a flow preserves deterministic accessory identity and removes the
  old listeners. Within an accessory, matching service subtypes are reused;
  changing the service type replaces the service. Accessory identity changes
  replace the accessory while transferring its services.

Keep implementation-specific scenarios in their respective suites and make
differences between legacy and event output explicit.

## Isolation and cleanup

Await `helper.unload()` after each flow test and await server shutdown before
removing its temporary directory. Register cleanup even while a node is waiting
for setup or a parent. Close callbacks must complete after asynchronous cleanup,
including when cleanup reports an error.

Restore spies, stubs, environment variables, and fake timers in teardown hooks.
Use fresh temporary directories for persistence tests and await all storage
operations before deleting them. Storage restart tests use separate writer and
reader processes; independent directories hold distinct data for the same key.
Callback tests use fake timers to test consumption and expiration precisely.

Tests exit naturally without `--exit`. The default test timeout is five seconds;
persistence restart tests explicitly allow twenty seconds. If a run hangs,
investigate its timers, sockets, listeners, and publication handles rather than
forcing process termination. CI jobs have a twenty-minute timeout.

## Coverage

Build, then run `npm run test:coverage`. Coverage includes all production
JavaScript under `build/lib`, `build/nodes`, and `build/plugins`, including files
that no test imports. Generated module wrappers are part of these measurements.

Reports are written to `coverage/`: open `coverage/index.html` for details, or
inspect `coverage/coverage-summary.json` and `coverage/lcov.info`.
[`vitest.config.mts`](vitest.config.mts) is the source of truth for statement,
branch, function, and line thresholds. Raise thresholds as coverage improves;
do not lower them to accommodate regressions. Prioritize uncovered routing,
error handling, callbacks, and cleanup branches.

## Mutation testing

Mutation testing checks the tests themselves. The runner first verifies that
the unmodified tests pass, then introduces one deliberate defect at a time.
For example, it removes a send, skips a characteristic update, or bypasses a
topic filter.

- **Killed:** tests fail and detect the introduced defect.
- **Survived:** tests still pass; investigate the missing assertion or whether
  the mutation actually changes observable behavior.

[`scripts/test-mutations.cjs`](scripts/test-mutations.cjs) targets ServiceUtils,
ServiceUtils2, CharacteristicUtilsBase, and Storage. The selected mutations cover
updates, sends, filtering, reachability, subscriptions, listener cleanup, and
callback consumption/expiration. This is a targeted check, not an exhaustive
mutation score. A runner timeout or infrastructure failure is not a killed
mutation; the JSON report must contain completed failing tests.

The runner modifies generated build files and restores each in `finally`.
Run it separately from builds and other tests to avoid reading mutated code.
If the process is forcibly interrupted, rebuild before running other commands.

## Packaged installation

`npm run test:package` builds the project, creates an npm tarball, and installs
it with Node-RED and the test helper into a fresh temporary project. It checks
declared runtime entry points and editor assets, then exercises a characteristic
update through the installed package. HAP network publication is stubbed.

The check needs registry access. It does not publish anything and removes the
temporary project after its child processes and flow cleanup finish.

## CI and dependency upgrades

The [test workflow](.github/workflows/tests.yml) builds and tests every configured
OS/Node combination, prints Node/npm versions, and asserts the requested Node
major. Ubuntu with Node 24 additionally runs coverage, mutation testing, and the
packaged-install smoke test. Coverage reports are uploaded as an artifact.

Local success verifies the local environment. A fresh GitHub Actions run is
required to verify the complete matrix.

API response fixtures are compatibility contracts. During HAP upgrades, review
large fixture changes explicitly alongside focused property assertions; do not
regenerate and accept them blindly. Keep version-conversion expectations
independent of the implementation.
