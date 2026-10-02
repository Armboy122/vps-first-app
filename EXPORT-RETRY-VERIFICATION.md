# Export retry verification

Verified on 2026-10-01 in `/workspace/scratch/c6643b6ab207/vps-first-app-fix/repo`, branch `fix/import-hardening`, with Node `v24.19.0` and Next.js `14.2.29`. The import suite uses Node 24's test-only `registerHooks` resolver and `--experimental-strip-types` to load the real TypeScript modules.

## Commands and results

| Command | Result |
|---|---|
| `TZ=UTC npm run test:imports` | Pass, 99 tests |
| `TZ=Asia/Bangkok npm run test:imports` | Pass, 99 tests |
| `TZ=America/Los_Angeles npm run test:imports` | Pass, 99 tests |
| `node --import ./tests/register-imports.mjs --experimental-strip-types --test tests/import-export-workflow.test.mjs` | Pass, 14 tests after the final BOM assertion-only test update |
| `npm run typecheck` | Pass (`tsc --noEmit`) |
| `npm run lint` | Pass (`next lint`, no ESLint warnings/errors) |
| `DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:59999/vps_placeholder?schema=public' NEXTAUTH_SECRET='build-placeholder-only' npm run build` | Pass; optimized production build completed with placeholder-only environment values |
| `git diff --check` | Pass |

The test suite includes 14 serializer/parser round-trip cases in `tests/import-csv-export.test.mjs`: Thai text, commas, quotes without commas, LF, CR, CRLF, combinations, escaped headers, empty/null/undefined values, `0`, `false`, and row ordering. It calls the real `generateCSVContent` and `parseCsvDocument` implementations.

The export workflow suite exercises the actual export component through the real Action and read service with mocked framework/download and database read ports. It covers seven filter combinations with inclusive date boundaries, five malformed or reversed-filter cases that must not fetch, empty-result and rejected-read retry behavior, and parsing the generated CSV. The component-generated Blob test counts exactly one U+FEFF in the decoded bytes, checks that the remaining CSV begins with the expected header, and verifies the filename and anchor lifecycle.

The 99-test suite passed in all three timezones before the final assertion-only addition to the export workflow test. The focused workflow suite was rerun after that change and passed all 14 tests. No production code, helper, or test-loader code changed for the assertion follow-up.

The environment emitted `Unknown env config "http-proxy"` during npm commands. Node also emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings when loading TypeScript test modules directly. The checks passed despite these warnings.

## Not verified

- The download test inspects the component-generated Blob bytes and simulates the anchor click with mocked DOM/download APIs; it does not run a real browser download.
- The service/action tests use mocked database ports. They do not establish PostgreSQL transaction isolation, concurrency behavior, rollback behavior, or deployed query/runtime limits.
- No live database, credentials, Prisma schema validation, migration application, push, or deployment was used for this verification. Placeholder-only build values do not validate production secrets, database connectivity, or deployment settings.
