# Import hardening verification

Verified on 2026-10-01 in `/workspace/scratch/c6643b6ab207/vps-first-app-fix/repo`, branch `fix/import-hardening`, using Node `v24.19.0`. These checks ran after the core changes were frozen. No live database, real credentials, migration apply, push, or deployment was used.

## Commands and results

| Command | Result |
|---|---|
| `TZ=UTC npm run test:imports` | Pass, 67 tests |
| `TZ=Asia/Bangkok npm run test:imports` | Pass, 67 tests |
| `TZ=America/Los_Angeles npm run test:imports` | Pass, 67 tests |
| `npm run typecheck` | Pass (`tsc --noEmit`) |
| `npm run lint` | Pass (`next lint`, no ESLint warnings/errors) |
| `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:59999/vps_placeholder?schema=public' npx prisma validate` | Pass; schema validation only, no database connection |
| `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:59999/vps_placeholder?schema=public' NEXTAUTH_SECRET='build-placeholder-only' npm run build` | Pass; optimized production build completed with placeholders only |
| `git diff --check` | Pass |

The test runner uses Node 24’s test-only `registerHooks` resolver with `--experimental-strip-types` to load TypeScript modules and application aliases. Production imports and Next.js configuration are unchanged by that test resolver.

The 67 mocked/unit tests cover strict UTF-8 and CSV structure, source-row accounting, headers, date/time boundaries, Thai/Buddhist dates, Excel 1900/1904 workbooks, outage authorization and idempotency, transformer chunk counts and retries, calendar partial writes, and stated row/byte caps. They establish application control flow against mocked ports, not real PostgreSQL behavior.

## Not verified

- The new Prisma migrations were not applied. Existing-database index drift was not reconciled.
- Mock transaction/concurrency/rollback tests do not prove PostgreSQL transaction isolation, uniqueness races, `xmax` counts, or raw SQL behavior.
- The 10 MiB, row-count, and 2.5 MB guards were tested as application contracts; deployed function payload, memory, and duration limits were not benchmarked.
- The successful build used placeholder-only environment values and does not validate production secrets, database connectivity, or deployment settings.
- The outage idempotency key remains in the mounted UI hook and can be lost on refresh/remount.

`npm` emitted the environment warning `Unknown env config "http-proxy"` during package commands; it did not affect any result.
