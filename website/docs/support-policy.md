# Support Policy

`@nest-native/drizzle` is a community package and does not claim official NestJS
or Drizzle ORM status.

## Supported Runtime Lines

| Runtime | Supported line |
| --- | --- |
| Node.js | `>=22` |
| NestJS | `^11.0.0 \|\| ^12.0.0` |
| Drizzle ORM | `>=0.30.0 <2.0.0` stable · `>=1.0.0-rc.1 <2.0.0` (core, see below) |
| TypeScript | Current project compiler line |

Drivers are optional peers. Install and test the driver your application uses.

### Drizzle ORM v1 (release candidate)

Drizzle ORM v1 is a release candidate (`1.0.0-rc.x`); the stable `latest` tag is
still on the `0.45.x` line. `@nest-native/drizzle` holds no dependency on
Drizzle internals — your client is an opaque value — and as of `0.4.0` the peer
range admits the RC line, so `npm install @nest-native/drizzle drizzle-orm@rc`
resolves cleanly.

**Supported on v1 RC (canary-tested):** module wiring (`forRoot` /
`forRootAsync`, named connections), `@InjectDrizzle()` / `@DrizzleRepository()`
DI, shutdown hooks, the testing helpers, and plain query building on all four
drivers (libSQL, better-sqlite3, node-postgres, mysql2). The non-blocking CI
job (`drizzle-orm v1 RC compatibility`) runs the full package suite against
`drizzle-orm@rc` on every push — including a real commit/rollback through the
CLS transactional adapter — and is expected green; a failure means a newer RC
regressed compatibility.

**Transactional adapter on v1 — solved upstream:**
`@nestjs-cls/transactional-adapter-drizzle-orm@1.4.0` widened its peer range to
`^0 || >=1.0.0-rc.1 <2.0.0`
([Papooch/nestjs-cls#604](https://github.com/Papooch/nestjs-cls/pull/604),
closing [#599](https://github.com/Papooch/nestjs-cls/issues/599)), so it
installs next to v1 with no override — and the range already admits stable
`1.x`. Earlier adapter versions still peer-pin `drizzle-orm@^0`; upgrade the
adapter rather than carrying an override. Our canary runs the adapter's real
commit/rollback against the RC on every push.

**Drizzle-Zod on v1 — already solved upstream:** the integration moved into
drizzle-orm itself as the `drizzle-orm/zod` subpath (zod is an optional peer
of drizzle-orm there; `/valibot`, `/typebox`, and `/arktype` moved the same
way). The standalone `drizzle-zod` package stays on the 0.x line, so migrate
the import — `'drizzle-zod'` → `'drizzle-orm/zod'` — when adopting v1. The RC
canary smokes this path (schema derivation + parsing) on every push; the spec
skips on 0.x, where the subpath does not exist.

Two migration notes that live in Drizzle's API, not this package's: v1's
Relational Queries v2 changes what the database type generic means (tables
record → relations) and removes the positional-client init overloads — use the
unified `drizzle({ client })` form, which works on `0.32+` and v1 alike. When
v1 goes GA and the CLS adapter ships v1 support, this policy drops the RC
caveats; the peer range already covers `1.x`.

### NestJS 12

NestJS 12 is supported on the same peer range as 11: `^11.0.0 || ^12.0.0` on
`@nestjs/common` and `@nestjs/core`, and `^11.4.7 || ^12.0.0` on the optional
`@nestjs/swagger` peer. Package versions up to `0.4.0` declare `^11.0.0` and
npm refuses to install them next to 12; use a release whose peer range admits
12 (see the changelog).

Nothing in the package had to change. NestJS 12 is ESM-only with an exports
map, under which a deep import of a *directory* (`@nestjs/common/interfaces`)
no longer resolves; this package imports only the public `@nestjs/*` entry
points, and a test keeps it that way. The `NestJS 12 compatibility` CI job
installs 12 on top of the 11.x lockfile in every workspace, proves each
workspace resolves 12, and re-runs the package suite (real PostgreSQL and
MySQL included), the build, and the whole sample matrix on every push. The
devDependencies and lockfile stay on 11.x, so both ends of the range are
tested rather than assumed.

When adopting 12:

- **Transaction bridge.** `nestjs-cls@6.2.x` and `@nestjs-cls/transactional@3.2.x`
  peer-pin `@nestjs/*` to `< 12`. Use `nestjs-cls@^6.3.0`,
  `@nestjs-cls/transactional@^3.3.0`, and
  `@nestjs-cls/transactional-adapter-drizzle-orm@^1.5.0`, which admit 12 — all
  minor releases inside the ranges this repository already declares.
- **Lifecycle hooks.** NestJS 12 orders each lifecycle hook by the component's
  level in the module hierarchy, so two providers can see the *same* hook in a
  different order than on 11. The phase order is unchanged (every
  `onModuleInit` still completes before any `onApplicationBootstrap`). This
  package's only hook, `DrizzleConnectionManager.onModuleDestroy`, closes the
  clients the module owns and depends on no other provider's hook; do not
  write application code that assumes a cross-provider order within a phase.
- **Node.js.** NestJS 12 is ESM-only, so CommonJS code — this package, the
  `ts-node` samples — loads it through `require(esm)`, which is unflagged from
  Node `20.19` / `22.12`. This package's `>=22` line is unchanged, but Node
  22.0–22.11 cannot load NestJS 12 that way.

## Public API Tiers

Primary application APIs:

- `DrizzleModule`
- `@InjectDrizzle()`
- `@DrizzleRepository()`
- `@Transactional()`
- `@InjectTransaction()`

Testing APIs:

- `DrizzleTestModule`
- `createDrizzleMockClient()`
- `createDrizzleRepositoryMock()`

Advanced integration APIs:

- token helpers such as `getDrizzleClientToken()`
- `DrizzleConnectionManager`
- error mapper helpers

Prefer primary APIs in normal application code. Use advanced APIs only when an
external integration or focused test needs the exact internal provider contract.

## Dependency Policy

The published package keeps `"dependencies": {}` empty. Runtime integrations
belong in `peerDependencies`, and package-local build/test tools belong in
`devDependencies`.

This avoids pulling a second Nest runtime, a surprise database driver, or an
unused transaction stack into host applications.

## Security Expectations

Security review should cover:

- dependency additions and lockfile churn
- install and lifecycle scripts
- driver configuration examples
- secret leakage in docs, samples, and tests
- unsafe dynamic execution or deserialization
- injection surfaces in SQL, paths, commands, and templates

High-risk findings should block merge until they are mitigated or explicitly
accepted by maintainers.
