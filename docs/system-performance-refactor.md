# System Performance Refactor

## Compatibility contract

This refactor must preserve:

- all visible UI, labels, colors, page flows, and responsive behavior;
- business-calendar, authorization, request-status, and OMS rules;
- existing server-action and route response contracts unless a change is
  strictly additive;
- the current PostgreSQL schema and stored data unless a reviewed migration is
  explicitly included.

Performance work is verified against these constraints before merging.

## Measured baseline — 2026-07-27

### Delivery

| Metric | Baseline |
| --- | ---: |
| GitHub Actions deploy duration | 319 s |
| Docker build and GHCR push | 211 s |
| VPS deploy/pull/readiness | 72 s |
| Runtime image size | 1,020,883,005 bytes |
| Runtime `/app/node_modules` | 959.2 MiB |
| Local production build | 18.5 s |

Root causes:

1. The final image copied all production dependencies even though Next.js
   standalone output already contains a traced runtime dependency set.
2. GitHub Actions used an uncached `docker build` followed by two serial
   `docker push` commands. No BuildKit cache survived between runs.
3. Local `.next/standalone` and `.next/static` were explicitly re-included in
   the Docker build context.
4. Runtime identity was inferred from the container image name; the health
   response did not expose the deployed commit.
5. Docker liveness queried PostgreSQL every 20 seconds.

### Runtime

| Metric | Baseline |
| --- | ---: |
| App idle memory | 117.1 MiB |
| PostgreSQL idle memory | 62.3 MiB |
| PowerOutageRequest rows | about 18,216 |
| Main list fetch limit | 1,000 rows |
| Main list First Load JS | 305 kB |
| Create page First Load JS | 383 kB |
| Internal VPS `/login` response | 3.8–8.4 ms |
| Internal VPS `/api/health` response | 4.4–15.6 ms |
| External HTTPS response from Thailand | 204–322 ms |

Root causes and risks:

1. The main list fetches up to 1,000 relational records and performs filtering,
   sorting, summary aggregation, and pagination in the browser.
2. Every successful row mutation reloads that full dataset.
3. CSV batch validation performs calendar and transformer queries inside a row
   loop, then repeats calendar validation in the service.
4. Server actions currently combine transport, session lookup, authorization,
   validation, orchestration, persistence, cache invalidation, and error
   mapping in files up to roughly 900 lines.
5. Server-only services expose UI helpers and are imported by client hooks,
   weakening the server/client boundary.
6. Database-backed GET route handlers were evaluated during `next build`.
7. Production logs contain repeated expected constraint errors and PostgreSQL
   collation warnings, reducing the signal-to-noise ratio.

The internal response measurements show that the idle Next.js runtime and
PostgreSQL connection are not the main source of current page latency. Most of
the anonymous-route round trip observed from Thailand is network/TLS latency.
The application-side priorities are therefore payload size and data-flow
amplification, rather than replacing the VPS solely for CPU performance.

## Target architecture

```text
UI components (unchanged)
        |
client query/mutation adapters
        |
server actions / route handlers
  transport + contract mapping only
        |
application use cases
  authorization + orchestration
        |
domain policies
  pure status/calendar/request rules
        |
repositories
  Prisma queries + transactions
        |
PostgreSQL
```

Cross-cutting concerns:

- typed result/error contracts at the transport boundary;
- request timing and correlation metadata around application use cases;
- cache tags owned by application modules, not UI components;
- versioned readiness/liveness endpoints;
- behavior-focused regression tests around domain policies and action contracts.

## Migration plan

### Phase 1 — delivery and runtime boundaries

- Persist Docker layers with the GitHub Actions cache.
- Publish only standalone runtime dependencies plus an isolated Prisma CLI.
- Remove local build artifacts from Docker context.
- Embed the Git SHA and expose it through health endpoints.
- Split cheap liveness from database-backed readiness.
- Force database route handlers to execute only at runtime.
- Reject oversized images before replacing the running app.
- Verify the readiness response contains the exact Git SHA being deployed.
- Validate pull requests with cached typecheck and production-build jobs.

### Phase 2 — domain and application seams

- Move UI-only request status helpers out of the Prisma service.
- Extract session/authorization into one server-only application dependency.
- Split request, user, calendar, and transformer actions by use case.
- Introduce repositories with narrow query DTOs rather than returning Prisma
  models through every layer.
- Lock current behavior with regression tests before moving each policy.

### Phase 3 — query model

- Move filtering, globally correct sorting, and pagination to PostgreSQL.
- Fetch only the current page while calculating summaries in aggregate queries.
- Preserve the existing list/action props through a client adapter.
- Replace full reloads after mutations with an updated row plus summary
  invalidation.

### Phase 4 — batch path

- Normalize and validate input once.
- Load all calendar entries for the batch date range in one query.
- Load all referenced transformers with one `IN` query.
- Create the batch with one reviewed transaction strategy.
- Preserve row-level validation messages and all-or-nothing semantics.

### Phase 5 — observability and operations

- Add structured duration/error logs around server actions and repositories.
- Separate expected domain/constraint failures from unexpected errors.
- Repair the PostgreSQL collation version warning during an approved
  maintenance window.
- Add deploy budgets for build, image size, readiness time, and response time.

## Acceptance gates

- UI screenshot/interaction behavior is unchanged.
- Business-policy regression tests pass.
- TypeScript and production build pass without attempting database access.
- Image size is materially below the 1.02 GB baseline.
- A warm deploy reuses dependency and Next.js build cache.
- `/api/health/live` does not query PostgreSQL.
- `/api/health` reports the exact deployed Git SHA and database readiness.
- Main list results, ordering, filters, summaries, and permissions match the
  current production behavior.
- Remaining-business-day urgency counts include today when today is a
  configured business day.

## Phase 1 verification

Verified locally on 2026-07-27:

- `npm run typecheck` passes.
- `npm run build` passes without attempting a database connection.
- GitHub workflow and Docker Compose YAML files parse successfully.
- `scripts/deploy-server.sh` passes Bash syntax validation.
- Docker Compose production and UAT configurations validate.
- Main-list First Load JS decreased from 305 kB to 287 kB after removing an
  unused client import of the server-side Prisma service.

The local OrbStack VM did not start, so image verification was moved to the
isolated UAT environment. UAT CI verified commit `713a919`:

- image size on the VPS: 280,619,323 bytes (72.5% below baseline);
- compressed GHCR layers: 104.5 MiB;
- first cache-seeding build/push: 315 s;
- readiness returned the exact deployed Git SHA;
- authenticated USER and VIEWER list flows loaded without console errors.

The first build includes the cost of exporting the BuildKit cache. A subsequent
UAT deployment is required to record the warm-cache duration.
