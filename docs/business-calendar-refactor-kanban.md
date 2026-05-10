# Business Calendar Refactor Kanban

Updated: 2026-05-10 23:37 Asia/Bangkok

## Goal

Refactor outage request scheduling so every layer uses the same business-day rule:

- Count working days only.
- Exclude weekends.
- Exclude configured holidays.
- Support special workdays.
- Enforce the rule on the server before writing to production data.

Current working rule decision: an outage date is valid when it is at least 10 business days from today, and the outage date itself must be a business day.

## Environment

- VPS: `peas3@103.117.149.118`
- Production app: `https://peas3.shop`
- DB access strategy: SSH tunnel only, do not expose PostgreSQL publicly.
- Local tunnel: `127.0.0.1:15432 -> VPS 127.0.0.1:5432`
- Tunnel PID when last checked: `60016`
- Production DB migration: `20260510230801_add_business_calendar_core` applied.
- Production DB seed/import: Thai government holidays for 2026 imported, `GLOBAL` scope, 22 active `HOLIDAY` rows.

## Board

### Backlog

| ID | Task | Owner | Notes |
| --- | --- | --- | --- |
| - | - | - | - |

### Ready

| ID | Task | Owner | Notes |
| --- | --- | --- | --- |
| - | - | - | - |

### In Progress

| ID | Task | Owner | Notes |
| --- | --- | --- | --- |
| BC-INFRA-01 | Keep DB tunnel available for local verification | Codex | Opened on local port `15432` |

### Review

| ID | Task | Owner | Notes |
| --- | --- | --- | --- |
| - | - | - | - |

### Done

| ID | Task | Owner | Notes |
| --- | --- | --- | --- |
| BC-DISC-01 | Audit affected date logic | Agents | Server, client, CSV, status, dashboard, print/export |
| BC-DISC-02 | Inspect VPS and production DB shape | Codex | App/db healthy; no existing holiday tables |
| BC-DISC-03 | Decide DB-backed calendar strategy | Codex | DB is source of truth; seed/import optional |
| BC-PLAN-01 | Create tracking board and execution plan | Codex | This file |
| BC-CORE-01 | Add Prisma business calendar models and migration | Agents/Codex | Date-only holidays; non-destructive migration added and deployed |
| BC-CORE-02 | Add business calendar service | Agents/Codex | DB-backed service with weekend-only fallback |
| BC-CORE-03 | Add server actions/API for calendar data | Agents/Codex | Admin server actions for list/create/update/delete/bulk import added |
| BC-UI-01 | Fix existing date rule mismatch | Agents/Codex | Create flow migrated to 10 business days |
| BC-UI-02 | Fix time picker bounds regression | Agents/Codex | Start max 19:30; end max 20:00 |
| BC-CSV-01 | Fix CSV date parsing | Agents/Codex | Strict `DD/MM/YYYY` parsing enabled |
| BC-CSV-02 | Migrate CSV validation/template to business days | Agents/Codex | Row errors and sample dates updated |
| BC-STATUS-01 | Migrate request list urgency status | Agents/Codex | `getUrgencyStatus`, OMS summary, dashboard buckets updated with business-day labels |
| BC-ADM-01 | Add admin calendar tab | Agents/Codex | CRUD, filters, pagination, and CSV import UI added |
| BC-ADM-02 | Add holiday import template | Agents/Codex | CSV columns documented in admin import panel |
| BC-UI-03 | Wire configured holidays into client date picker metadata | Codex | Create form fetches active calendar metadata and disables weekends/holidays while honoring special workdays |
| BC-DATA-01 | Import Thai government holidays for 2026 | Codex | 22 active `HOLIDAY` rows imported to production DB; weekends are excluded by logic, not stored |
| BC-DOC-01 | Document production calendar operations | Codex | See `docs/business-calendar-operations.md` |
| BC-VERIFY-01 | Run validation checks | Codex | `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`, `npx prisma migrate status` passed |

## Imported 2026 Thai Government Holidays

Source decision: use government holidays, not bank-only holidays. Weekends are not stored in DB because the application excludes Saturdays and Sundays automatically. DB rows are only exceptions: `HOLIDAY` and `SPECIAL_WORKDAY`.

Sources checked:

- Thai PBS NOW holiday calendar for 2026, which cites the Prime Minister's Office/Royal Gazette annual holiday notice.
- Cabinet resolution summary dated 2025-12-02 for the 2026 special government holidays and the 22-day overview.

Imported dates:

| Date | Type | Name |
| --- | --- | --- |
| 2026-01-01 | HOLIDAY | วันขึ้นปีใหม่ |
| 2026-01-02 | HOLIDAY | วันหยุดราชการกรณีพิเศษ |
| 2026-03-03 | HOLIDAY | วันมาฆบูชา |
| 2026-04-06 | HOLIDAY | วันจักรี |
| 2026-04-13 | HOLIDAY | วันสงกรานต์ |
| 2026-04-14 | HOLIDAY | วันสงกรานต์ |
| 2026-04-15 | HOLIDAY | วันสงกรานต์ |
| 2026-05-04 | HOLIDAY | วันฉัตรมงคล |
| 2026-05-13 | HOLIDAY | วันพระราชพิธีพืชมงคลจรดพระนังคัลแรกนาขวัญ |
| 2026-06-01 | HOLIDAY | วันหยุดชดเชยวันวิสาขบูชา |
| 2026-06-02 | HOLIDAY | วันหยุดราชการเพิ่มเป็นกรณีพิเศษ |
| 2026-06-03 | HOLIDAY | วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี |
| 2026-07-28 | HOLIDAY | วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว |
| 2026-07-29 | HOLIDAY | วันอาสาฬหบูชา |
| 2026-07-30 | HOLIDAY | วันเข้าพรรษา |
| 2026-07-31 | HOLIDAY | วันหยุดราชการเพิ่มเป็นกรณีพิเศษ |
| 2026-08-12 | HOLIDAY | วันแม่แห่งชาติ |
| 2026-10-13 | HOLIDAY | วันนวมินทรมหาราช |
| 2026-10-23 | HOLIDAY | วันปิยมหาราช |
| 2026-12-07 | HOLIDAY | วันหยุดชดเชยวันพ่อแห่งชาติ วันชาติ และวันคล้ายวันพระบรมราชสมภพ ร.9 |
| 2026-12-10 | HOLIDAY | วันรัฐธรรมนูญ |
| 2026-12-31 | HOLIDAY | วันสิ้นปี |

## Acceptance Criteria

- Server rejects outage dates that are not business days.
- Server rejects outage dates with fewer than 10 business days lead time.
- Create form shows business-day counts and earliest valid date.
- Date picker prevents weekend and configured holiday selection, while allowing configured special workdays.
- CSV/Excel import uses identical validation and error wording.
- Status/list/dashboard urgency uses the same date engine where applicable.
- Admin can manage holiday/special workday data without deploy.
- `npm run build` and `npm run typecheck` pass.

## Risk Log

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Client/server holiday data mismatch | User can select a date that fails submit | Server is source of truth; client fetches calendar metadata |
| Timezone drift between date-only holidays and DateTime requests | Off-by-one day bugs | Store holidays as `@db.Date`; use `yyyy-MM-dd` keys in services |
| Existing dirty working tree | Merge conflicts and accidental overwrite | Keep changes scoped; do not revert user edits |
| Production migration risk | App startup runs `prisma migrate deploy` | Add tables only first; avoid destructive migrations |
| Build touches API routes that query DB | False alarms during local build | Keep SSH tunnel open or mark health route dynamic if needed |
| Login page image optimization errors in dev | Browser smoke cannot reach authenticated create form without a session | Build passes; route redirects correctly. Track separately if login screen remains stuck |

## Verification Log

| Check | Result | Notes |
| --- | --- | --- |
| `npx prisma validate` | Passed | Schema valid |
| `npx prisma migrate deploy` | Passed | Applied `20260510230801_add_business_calendar_core` to `PeaTransformer` through SSH tunnel |
| `npx prisma migrate status` | Passed | Database schema is up to date |
| `node Prisma count` | Passed | `BusinessCalendarDate count: 22` for active 2026 `GLOBAL` holidays |
| `npx tsc --noEmit` | Passed | No TypeScript errors |
| `npm run lint` | Passed | No ESLint warnings or errors |
| `npm run build` | Passed | Build succeeded with SSH DB tunnel open |
| Playwright smoke | Partial | `/power-outage-requests/create` redirects to `/login` as expected without a session; login page remained on auth-checking state and image optimization returned 400 for existing login assets |

## Agent Work Splits

| Agent | Scope | Write Ownership |
| --- | --- | --- |
| Core worker | Prisma models, calendar service, server validation | `prisma/`, `lib/services/businessCalendar.service.ts`, `lib/utils/date.utils.ts`, `lib/services/powerOutageRequest.service.ts` |
| Create/CSV worker | Create form, date picker, time picker, CSV parser/template | `app/power-outage-requests/create/`, `lib/validations/powerOutageRequest.ts` |
| Status worker | List urgency, OMS summary, dashboard buckets | `lib/utils/status-utils.ts`, `components/PowerOutageRequest/`, `components/Dashbord/`, `app/api/action/dashboard.ts` |
| Admin worker | Calendar management UI/actions | `app/admin/`, `app/api/action/businessCalendar.ts`, calendar components |
