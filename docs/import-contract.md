# Import contract

This document records the import behavior implemented in this branch. It covers outage requests, transformers, and the business calendar; it is not a promise about deployed capacity.

## Shared CSV behavior

- CSV uploads are decoded as strict UTF-8. A leading UTF-8 BOM is accepted and removed. Invalid UTF-8 is rejected instead of being replaced with mojibake; Windows-874/TIS-620 is not supported.
- The shared parser preserves quoted commas, doubled quotes, and newlines inside quoted fields. Blank physical records are ignored for row counts but do not renumber later records.
- Headers must match one of the importer’s supported ordered column lists after trimming surrounding whitespace and case-normalizing. Missing, reordered, duplicate, and extra columns are rejected. Header-only files are rejected and never stage or persist data.
- Diagnostics use one-based physical source rows. A CSV data row’s number refers to its starting line in the original file; blank lines and lines inside a quoted field still affect later row numbers. Excel rows use one-based worksheet rows, including blank rows.
- The parser is used by outage, transformer, and calendar CSV flows. Workbook files are supported only by the outage importer.

## Outage requests

**Files and rows**

- Accepts `.csv`, `.xls`, and `.xlsx`; only the first worksheet is read from a workbook.
- Client file-size limit: 10 MiB. The preview accepts up to 500 nonblank data rows. The server batch accepts at most 500 requests and at most 2,500,000 UTF-8 bytes for the serialized request body.
- CSV headers are role-specific and ordered. A regular user supplies date, start time, end time, transformer number, GIS details, and area. An administrator also supplies work-center and branch names before the transformer fields.
- CSV dates use the shared strict UTF-8 parser. Workbook date serials use the workbook’s 1900/1904 date-system flag. The fictitious 1900-02-29 serial is rejected. A CSV serial has no workbook metadata and is interpreted using the 1900 system.

**Values and validation**

- Accepted text date forms are `YYYY-MM-DD`, `YYYY/MM/DD`, `DD-MM-YYYY`, and `DD/MM/YYYY`, with two-digit month/day. Years greater than 2400 are interpreted as Buddhist Era and reduced by 543 before Gregorian validation. Numeric Excel serials are floored to their calendar day; the 1900 system accepts serials 1–2,958,465 except serial 60.
- Accepted time forms are `H:MM`, `HH:MM`, `HH:MM:SS` (seconds are validated then discarded), `HMM`/`HHMM`, `H.M`/`HH.MM`, and Excel day fractions between 0 and 1 (rounded to the nearest minute). Invalid values and a rounded result of 24:00 are rejected.
- Outage start times must be 06:00–19:30; end times must be 06:30–20:00; the end must be at least 30 minutes after the start.
- Preview and final creation use server calendar validation. The default rule is at least six business days and more than ten calendar days ahead; active holiday and special-workday entries can change the business-day count.
- A `USER` can create only in their assigned work-center/branch pair. `ADMIN` can create for any valid pair; uploaded work-center names must match uniquely after trim/case normalization, and a branch must uniquely match by short or full name within that work center. `VIEWER`, `MANAGER`, and `SUPERVISOR` cannot create requests. The server verifies the branch/work-center relationship.
- Preview stages valid rows into the request form and reports invalid rows separately. Staging does not write requests to the database; the user must submit the form.

**Commit and retry**

- A bulk submit carries a UUID idempotency key. The UI reuses it while the staged payload is unchanged and replaces it if the payload changes; it clears the key after confirmed success. The key lives in the mounted hook, not durable browser storage, so a refresh/remount may lose it.
- The payload hash binds the key to the authenticated actor and the normalized request list; input array order is significant. Reusing a key with another actor or a changed/reordered payload fails. Each submit still checks current scope and branch authorization. An exact retry avoids mutable calendar/transformer-existence checks and does not create duplicate rows. Saved response order is by database ID, without a guarantee that it matches input order.
- The key ledger and every request in one batch are written in one database transaction. Incomplete or corrupt stored request IDs fail closed; the importer does not recreate rows from a damaged ledger.

## Transformers

**Files and rows**

- Admin CSV only. Client limit: 10 MiB and 10,000 nonblank data rows. The server Action accepts at most 1,000 rows per call; the UI sends bounded 250-row calls.
- Headers are ordered `transformerNumber,gisDetails` or `หมายเลขหม้อแปลง,รายละเอียด GIS`. The UI rejects a header-only file and validates every data row before upload. Transformer numbers allow ASCII letters/digits, hyphen, underscore, or period and are limited to 100 characters; GIS details must be nonblank and at most 500 characters.
- Whole-file deduplication happens before 250-row chunking. Transformer numbers are trimmed, then compared case-sensitively. The first row wins; later duplicates are skipped and reported with both source row numbers.
- The server trims/sanitizes values using the same 100-character transformer-number and 500-character GIS limits.

**Persistence and partial results**

- Each server chunk is upserted by transformer number in its own transaction. Reported created/updated counts are accepted only when the SQL result accounts for every unique row in that chunk.
- A failed chunk contributes no saved count; earlier committed chunks remain committed. Structured row-level failures are reported and subsequent chunks may continue; a thrown transport error stops later chunks. The client maps errors back to original physical rows and retains the selected file if any chunk is unconfirmed or fails.
- A duplicate within a direct Action request is also reduced to its first occurrence, though the UI normally removes whole-file duplicates before making Action requests.

## Business calendar

- Admin CSV only. Client and server limits are 10 MiB and 500 nonblank data rows.
- Accepted ordered headers are `date,name,type,scope,note,isActive` or the short form `date,name,type`. Blank scope defaults to `GLOBAL`; blank note defaults to empty; `isActive` defaults to true and is false only when its text is `false`, case-insensitively.
- Dates use the shared strict text/serial parser. Type aliases accepted by the CSV UI are `HOLIDAY` or `วันหยุด`, and `SPECIAL_WORKDAY`, `WORKDAY`, or `วันทำงานพิเศษ`.
- The server validates each row (name required and at most 120 characters, scope at most 60, note at most 500) and upserts sequentially by `(date, scope)`, not in one file-wide transaction. Earlier successful rows remain saved if a later row is invalid or fails. Duplicate `(date, scope)` rows are processed in order, so the later row updates the earlier one. The response reports created, updated, and row-level errors.
- Invalid dates are passed to the server as empty dates and become row errors; an invalid type is rejected by the CSV parser before the batch is submitted.

## Capacity and verification boundary

The byte/row caps are application guards, not evidence that a particular hosting plan can process every maximum-size request. UI parsing, mocks, and local tests do not prove PostgreSQL concurrency/rollback behavior or deployed function request/duration limits. Apply no migration and use no live database as part of this contract verification.
