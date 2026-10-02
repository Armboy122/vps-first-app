# Isolated Next.js + Elysia preview

This branch extends the local import/export checkpoint `cc77978`. It does not migrate the recovered VPS or connect the original database.

## Runtime and architecture

- Next.js 15.5.27, React 19.2.8, NextAuth 4.24.15, Prisma 5.22, Elysia 1.4.30 and Eden 1.4.9 are locked for Node 24.
- Elysia runs inside the Next.js Node App Router at `/api/v1`; no separate listener or wildcard CORS is used.
- Outage domain authorization and application commands are shared by Elysia and the compatibility Server Actions. Browser code imports only API types and uses same-origin HTTP.
- Actors are reloaded by immutable session user ID on every operation. Database passwords, hashes, URLs and stack traces are excluded from API responses.
- Cookie-authenticated mutations require the exact same Origin, the `x-vps-client: web` header and JSON content type. Reads are private/no-store.

## Exact preview boundary

The application refuses to construct a runtime Prisma client unless `APP_ENV=preview`, the host is one of the verified direct/pooled preview endpoints and the database is `vps_tr_mock`. It rejects production Vercel environment, alternate routing options, unknown/duplicate query parameters, nondefault ports, fragments and insecure TLS. The seed and preparation commands use that same target validator.

Production compilation uses an explicitly disconnected build-only datasource and rejects database queries. Ordinary `npm run build`, `dev`, `start` and `postinstall` do not apply migrations or seed data. `postinstall` generates the Prisma client only.

The external Apps Script PDF integration remains in source, but the preview blocks direct invocation before any fetch. The preview UI also hides that integration.

## Owner-entered environment

Use Vercel Preview-only values; never paste credentials into repository files or logs:

- `APP_ENV=preview`
- `DATABASE_URL`: verified pooled `vps_tr_mock` connection
- `DIRECT_URL`: verified direct `vps_tr_mock` connection, used by explicit preparation only
- `NEXTAUTH_SECRET`: owner-entered random login-signing secret
- `NEXTAUTH_URL`: verified branch alias, or derived from the platform's strictly validated `VERCEL_BRANCH_URL`

Vercel Authentication and application login are independent protections.

## Explicit one-time preparation

Normal builds are side-effect-free. Only the owner-authorized temporary build override may run:

`npm run preview:prepare && npm run build`

It also requires:

- `VERCEL_ENV=preview` (platform-provided)
- `PREVIEW_PREPARE_ONCE=prepare-vps-tr-mock-20261001`
- `PREVIEW_ADMIN_PASSWORD`: owner-entered strong synthetic password, never a shared or employee-ID default

Preparation validates all opt-in/target/password gates before any connection or subprocess. It applies checked-in migrations using `DIRECT_URL`, seeds synthetic organization/lookups, creates `DEMO_ADMIN` only if absent using bcrypt, and seeds synthetic outages. Existing passwords and edited demo rows are preserved on rerun. Subprocess output and credential values are never printed.

After confirmed success, restore the normal build command and remove `PREVIEW_PREPARE_ONCE` and `PREVIEW_ADMIN_PASSWORD`. Keep `NEXTAUTH_SECRET` for application login. This document does not assert that preparation or deployment has run.

## Synthetic data and policy

Fixtures contain 13 synthetic work centers, 66 branches, 30 transformers, four calendar exceptions and 30 outages around recorded Thailand anchor 2026-10-01. They include past/current/future buckets, all status pairs and future CONFIRM/NOT_ADDED default-list examples. The nullable unique `seedKey` identifies demo outage rows; ordinary created rows are unaffected. New downloadable import samples use fresh server-calendar validation rather than bypassing creation rules.

The compatibility policy preserves the current UI: ADMIN all; VIEWER reads all; other roles read their assigned center; USER edits/deletes/changes request status within that center; SUPERVISOR changes OMS within that center. USER creation is restricted to its exact center/branch pair. Creation still sets CONFIRM. The conflicting legacy “only own/unapproved” comment is a separate product-policy decision; no new manager approval workflow was invented.

## Verification boundary

Mocks establish authorization, API/CSRF/schema, persistence accounting, retry and preparation control flow. They do not establish real PostgreSQL rollback/races or an authenticated deployed flow. Those checks must follow the approved isolated preparation and deployment. No production/recovered data belongs in this preview.
