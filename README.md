# @nest-native/drizzle

<p align="center">Nest-native Drizzle ORM integration with dependency injection, repositories, and transaction decorators.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nest-native/drizzle"><img src="https://img.shields.io/npm/v/@nest-native/drizzle.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@nest-native/drizzle"><img src="https://img.shields.io/npm/dm/@nest-native/drizzle.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="Package License" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Test Coverage" />
  <a href="https://nest-native.github.io/drizzle/"><img src="https://img.shields.io/badge/docs-%40nest--native%2Fdrizzle-0f766e.svg" alt="Documentation" /></a>
</p>

> [!IMPORTANT]
> **Renamed package.** This project was previously published as `nest-drizzle-native`. It is now **`@nest-native/drizzle`** (repo: [`nest-native/drizzle`](https://github.com/nest-native/drizzle)).
>
> ```bash
> npm uninstall nest-drizzle-native
> npm install @nest-native/drizzle
> ```
> Update imports from `nest-drizzle-native` to `@nest-native/drizzle`. The old package is frozen at `0.2.1` and no longer maintained.

## What This Is

`@nest-native/drizzle` is a community NestJS integration for applications that
want Drizzle ORM with Nest-style modules, dependency injection, repository
classes, lifecycle cleanup, and transaction decorators without hiding Drizzle's
SQL-first query builder.

It solves the Nest/Drizzle shape mismatch without turning Drizzle into Active
Record: your app still owns schemas, drivers, migrations, validation, and SQL;
the package gives those pieces a clean Nest home.

First paths:

- [Quick Start](https://nest-native.github.io/drizzle/docs/quick-start)
- [Samples](https://nest-native.github.io/drizzle/docs/samples/)
- [Transactions](https://nest-native.github.io/drizzle/docs/transactions)
- [Testing](https://nest-native.github.io/drizzle/docs/testing)
- [Deployment](https://nest-native.github.io/drizzle/docs/deployment)

## Why Use It

`@nest-native/drizzle` keeps Drizzle explicit while giving Nest applications a
native integration surface:

- Module setup via `DrizzleModule.forRoot()` and `DrizzleModule.forRootAsync()`
- Direct client injection through `@InjectDrizzle()`
- Repository classes with `@DrizzleRepository()` and `DrizzleModule.forFeature()`
- Named connections for multi-database applications
- Shutdown hooks for drivers owned by the Nest module
- Transaction decorator bridges for `@nestjs-cls/transactional`
- Testing helpers for isolated modules and repository mocks

## Compatibility

| Runtime | Supported line |
| --- | --- |
| Node.js | `>=22` (`>=22.12` with NestJS 12 — see the NestJS 12 note below) |
| NestJS | `^11.0.0 \|\| ^12.0.0` |
| Drizzle ORM | `>=0.30.0 <2.0.0` stable · v1 RC core support since `0.4.0` |
| Transaction bridge | `@nestjs-cls/transactional`, optional |
| Drivers | Bring the Drizzle driver your app uses |

Drizzle ORM v1 (`1.0.0-rc.x`) is supported for the **core surface** as of `0.4.0`:
the peer range admits `>=1.0.0-rc.1`, and the CI canary runs the full package
suite against `drizzle-orm@rc` — module wiring, DI, repositories, testing
helpers, and plain query building on all four drivers, including a real
CLS-adapter transaction. The whole path is now unblocked upstream:
`@nestjs-cls/transactional-adapter-drizzle-orm@1.4.0` accepts v1
([Papooch/nestjs-cls#604](https://github.com/Papooch/nestjs-cls/pull/604)), so
no npm override is needed, and the Drizzle-Zod path is already solved — it
moved into drizzle-orm as `drizzle-orm/zod`, and the canary smokes it. Details:
[Drizzle ORM v1 (release candidate)](website/docs/support-policy.md#drizzle-orm-v1-release-candidate).

NestJS 12 (ESM-only) is supported on the same peer range as 11. The package
imports only the public `@nestjs/*` entry points — a test keeps it that way —
and a dedicated CI leg runs the whole package suite and sample matrix on 12.
The Node.js floor depends on which end of that range you are on: NestJS 11
runs on any Node.js `>=22`, while NestJS 12 is loaded from CommonJS code (this
package, the samples) through Node's `require(esm)`, which is behind a flag
before Node.js 22.12.0 — so the 12 end needs Node.js `>=22.12`. `engines`
stays `>=22` because the 11 end does not need more. Details, including the
`nestjs-cls` line the transaction bridge needs on 12:
[NestJS 12](website/docs/support-policy.md#nestjs-12).

For peer dependency policy and API stability, see
[website/docs/support-policy.md](website/docs/support-policy.md).

## Repository Layout

This repository contains:

- `packages/drizzle`: the `@nest-native/drizzle` integration package
- `website/docs`: Docusaurus documentation for setup, APIs, samples, testing, quality gates, and support
- `sample`: focused runnable examples for each supported feature
- `scripts`: release, quality, coverage, and report-generation helpers
- `CONTRIBUTING.md`: contributor workflow, including sample/library PR separation

Samples are part of the public learning path. The set includes the full
showcase plus focused examples for direct client injection, repositories, async
configuration, named connections, transactions, Nest DTO validation, optional
Drizzle-Zod validation, driver setup, migrations, health checks, testing, raw
SQL, and Swagger.

## Installation

```bash
npm i @nest-native/drizzle drizzle-orm
```

Required peers:

```bash
npm i @nestjs/common @nestjs/core reflect-metadata rxjs
```

Install the Drizzle driver your app actually uses:

```bash
npm i pg
# or mysql2, better-sqlite3, @libsql/client, etc.
```

For `@Transactional()` and `@InjectTransaction()`, install and configure the CLS
transaction stack:

```bash
npm i @nestjs-cls/transactional
```

The published package has no runtime dependencies. Nest, Drizzle, drivers,
transactions, Swagger, class-validator, and Drizzle-Zod stay app-owned so teams
only install the ecosystems they actually use.

### Any Drizzle Client Works

The module never constructs the client: `connection` accepts whatever
drizzle-orm returns, so every driver and client helper works without a
dedicated integration. Read replicas drop in via drizzle-orm's `withReplicas`:

```ts
import { withReplicas } from 'drizzle-orm/pg-core';

DrizzleModule.forRoot({
  schema,
  connection: withReplicas(primaryDb, [replicaDb]),
});
// Reads route to replicas; writes and db.$primary hit the primary.
// Runnable proof: sample/21-read-replicas
```

The same contract covers edge and serverless clients such as Cloudflare D1
(`drizzle-orm/d1`) and Turso / remote libSQL (`drizzle-orm/libsql`). Those are
bring-your-own-driver setups — not CI-tested in this repository. See
[Production Patterns](https://nest-native.github.io/drizzle/docs/production-patterns)
for the snippets.

## Quick Start

Define schemas with standard Drizzle syntax. The library receives the schema
object as-is and does not introduce class entities.

```ts
import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DrizzleModule } from '@nest-native/drizzle';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

@Module({
  imports: [
    DrizzleModule.forRoot({
      schema,
      connection: drizzle(pool, { schema }),
      shutdown: () => pool.end(),
    }),
  ],
})
export class AppModule {}
```

Inject the client directly when a service needs the full Drizzle surface.

```ts
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nest-native/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  findMany() {
    return this.db.query.users.findMany();
  }
}
```

Use repositories as structured homes for query code while keeping Drizzle
explicit.

```ts
import { Module } from '@nestjs/common';
import {
  DrizzleModule,
  DrizzleRepository,
  InjectDrizzle,
} from '@nest-native/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

@DrizzleRepository()
export class UsersRepository {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  findById(id: string) {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }
}

@Module({
  imports: [DrizzleModule.forFeature([UsersRepository])],
  exports: [UsersRepository],
})
export class UsersModule {}
```

## Async Configuration

```ts
DrizzleModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const pool = new Pool({
      connectionString: config.getOrThrow('DATABASE_URL'),
    });

    return {
      schema,
      connection: drizzle(pool, { schema }),
      shutdown: () => pool.end(),
    };
  },
});
```

Named connections are supported for multi-database applications.

```ts
DrizzleModule.forRoot({
  connectionName: 'analytics',
  schema: analyticsSchema,
  connection: analyticsDb,
});

constructor(@InjectDrizzle('analytics') private readonly analytics: AnalyticsDb) {}
```

Root connections are global by default so feature modules can register
repositories with `DrizzleModule.forFeature()`. Set `isGlobal: false` when you
want to keep a connection scoped to one module boundary.

## Transactions

`@Transactional()` and `@InjectTransaction()` are bridged to
`@nestjs-cls/transactional`. This keeps transaction context management on the
well-tested CLS transaction stack instead of introducing a second
AsyncLocalStorage implementation.

```ts
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nest-native/drizzle';

@Injectable()
export class BillingService {
  @Transactional()
  async billCustomer(customerId: string) {
    // Calls across injected services can participate in the same transaction
    // once @nestjs-cls/transactional is configured for Drizzle.
  }
}
```

See [website/docs/transactions.md](website/docs/transactions.md) for the required CLS setup.

## Production Path

- Generate and apply migrations with standard Drizzle tooling before traffic.
- Use `shutdown` to close driver resources owned by the Nest app.
- Keep liveness process-only and readiness backed by a cheap Drizzle check.
- Prefer real Drizzle clients for tests that prove SQL, migrations,
  transactions, or driver behavior.

Runnable samples cover migrations, health checks, drivers, transactions,
testing, validation, raw SQL, and Swagger. Start with the
[sample catalog](https://nest-native.github.io/drizzle/docs/samples/catalog)
when you want a complete working pattern.

## Testing

```ts
import { Test } from '@nestjs/testing';
import {
  DrizzleTestModule,
  createDrizzleMockClient,
} from '@nest-native/drizzle';

const db = createDrizzleMockClient({
  query: {
    users: {
      findMany: () => [{ id: 'user_1' }],
    },
  },
});

const module = await Test.createTestingModule({
  imports: [DrizzleTestModule.forRoot({ client: db })],
}).compile();
```

Prefer real Drizzle clients for integration tests that prove SQL behavior,
transactions, migrations, or driver-specific assumptions. See
[website/docs/testing.md](website/docs/testing.md).

## Quality Gates

The repository starts with the same review posture as `nest-trpc-native` while
using `node:test` and `c8` for this package:

- package build, typecheck, and coverage on Node.js 22 and 24
- NestJS 12 compatibility leg: installs `@nestjs/*` 12 on top of the 11.x
  lockfile in every workspace, proves each workspace resolves 12, and re-runs
  the package suite, build, and sample matrix, so both ends of the peer range
  are tested
- coverage with `c8`, enforced at 100% for statements, branches, functions, and lines
- sticky PR comments for coverage, test performance, and cognitive complexity
- cognitive complexity enforcement with SonarJS threshold `15`
- package tarball validation
- sample version sync and workspace resolution validation
- dedicated CI sample validation
- supply-chain audit for high-severity issues

Run the local gate with:

```bash
npm run ci
```

Two **optional, local-only** layers sit on top (neither runs in CI, and forks
work without them):

- **Full mode** — `npm run infra:up && npm run test:full` runs the gated
  PostgreSQL/MySQL driver specs against disposable Docker containers
  (`compose.yaml`); `npm run infra:down` cleans up.
- **Mutation testing** — `npm run test:mutation` (incremental Stryker run;
  `test:mutation:full` re-tests everything). Scope with `STRYKER_MUTATE`,
  include the gated I/O specs with `STRYKER_WITH_INFRA=1`.

Details — including the pre-PR ritual and agent instructions — in
[GUIDELINES_NEST_DRIZZLE.md](GUIDELINES_NEST_DRIZZLE.md#local-full-mode-verification-optional-infra--mutation-testing).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and unreleased user-facing
changes.

## Documentation

The documentation is the canonical source of truth for usage guides and support
policy:

- Start:
  [Introduction](https://nest-native.github.io/drizzle/docs/introduction),
  [Why Native](https://nest-native.github.io/drizzle/docs/why-native),
  [Quick Start](https://nest-native.github.io/drizzle/docs/quick-start),
  [Adoption Guide](https://nest-native.github.io/drizzle/docs/adoption-guide)
- Core API:
  [Repositories](https://nest-native.github.io/drizzle/docs/repositories),
  [Transactions](https://nest-native.github.io/drizzle/docs/transactions),
  [API Reference](https://nest-native.github.io/drizzle/docs/api-reference)
- Testing:
  [Testing](https://nest-native.github.io/drizzle/docs/testing),
- Production:
  [Production Patterns](https://nest-native.github.io/drizzle/docs/production-patterns),
  [Multi-Tenant Applications](https://nest-native.github.io/drizzle/docs/multi-tenant),
  [Deployment](https://nest-native.github.io/drizzle/docs/deployment),
  [Deployment Recipes](https://nest-native.github.io/drizzle/docs/deployment-recipes),
  [Migration Operations](https://nest-native.github.io/drizzle/docs/migration-operations)
- Learn by example:
  [Samples](https://nest-native.github.io/drizzle/docs/samples/)
- Project reference:
  [Quality and CI](https://nest-native.github.io/drizzle/docs/quality-and-ci),
  [Contributing](https://nest-native.github.io/drizzle/docs/contributing),
  [Support Policy](https://nest-native.github.io/drizzle/docs/support-policy),
  [Roadmap](https://nest-native.github.io/drizzle/docs/roadmap)

## Roadmap

The package stays intentionally small: Nest-native module registration,
injection, repositories, transaction bridges, testing helpers, and focused
samples without making driver or validation choices mandatory.

See [website/docs/roadmap.md](website/docs/roadmap.md) for the current roadmap
and API boundaries.

## Philosophy

This library should feel native in NestJS projects while staying faithful to
Drizzle. Repositories organize query code; they do not replace Drizzle's query
builder, `sql` template, schema definitions, or type inference.
