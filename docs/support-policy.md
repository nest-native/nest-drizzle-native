# Support Policy

`@nest-native/drizzle` is a community package and does not claim official NestJS
or Drizzle ORM status.

## Supported Runtime Lines

| Runtime | Supported line |
| --- | --- |
| Node.js | `>=22` |
| NestJS | `11.x` |
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
