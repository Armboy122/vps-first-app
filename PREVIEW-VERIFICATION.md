# Preview implementation verification

Verified locally on 2026-10-01, Node 24.19.0. Baseline import/export checkpoint: `cc77978`. The checked tree uses supported Next.js 15.5.27, React 19.2.8, NextAuth 4.24.15, Prisma 5.22.0, Elysia 1.4.30 and Eden 1.4.9.

## Passed gates

- Clean `npm ci`, including local Prisma client generation
- `TZ=UTC npm test`: 170/170 tests (117 import/export/client/UI tests plus 53 API/security/preparation/seed tests)
- `TZ=Asia/Bangkok npm test`: 170/170
- `TZ=America/Los_Angeles npm test`: 170/170
- Typecheck (`tsc --noEmit`)
- Next lint and explicit ESLint for preparation/seed/fixture/security test files
- Prisma schema validation with a disconnected placeholder URL, without a DB connection
- Optimized production build with the build-only disconnected Prisma datasource
- `git diff --check`
- Local production HTTP mounting/auth smoke with no login or DB query: `/login` 200, `/api/health/live` 200, `/api/v1/me` 401, valid same-origin create 401, foreign-origin create 403; API responses private/no-store and sanitized
- Preparation CLI modules import under the exact Node/register-hooks command; preparation tests invoke only mocked ports

The original 99 import/export assertions remain, with legitimate authenticated mock fixtures updated for the guarded transports. Eighteen frontend/API-client/sample tests and 53 preview/API/security/preparation/seed tests extend that baseline.

## Safety and limits

- No live database connection, migration, real seed, credential provisioning, push or deployment was performed during these checks
- The one-time preparation path has a separate exact opt-in, strict shared host/database/TLS/routing guard and owner-supplied password; normal builds never execute it
- Sixteen checked-in migrations and the synthetic seed still need the separately approved isolated preparation run
- Real PostgreSQL SQL/transaction/concurrency behavior and authenticated deployed login/create/reload/import/export remain unverified
- Vercel Authentication and application-login secrets/configuration must be verified before the preview is usable
- Seed transactions explicitly allow bounded regional latency; mocked timing is not a deployment benchmark
- Request creation status and existing per-center USER workflow were preserved; conflicting legacy ownership/approval comments remain a future product-policy decision

## Dependency gate notes

The clean-install gate exposed two unrelated inherited issues. Unused Mermaid CLI attempted a Chromium download into an unavailable cache, so that unused development dependency was removed; the existing ERD artifact is preserved. Direct UI imports of `lodash/debounce` had relied on a transitive dependency, so Lodash 4.18.1 is now an explicit locked runtime dependency. Unused React-18-only Tremor was removed for the supported React 19 upgrade.

ESLint 8 and several development transitive packages emit deprecation warnings; Next 15's `next lint` command is also deprecated. Checks pass, and those warnings are not described as security approval for a future production rollout.
