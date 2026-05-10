# Business Calendar Operations

## Rule

The application treats a business day as:

- Monday to Friday by default.
- Excluding active `HOLIDAY` rows in `BusinessCalendarDate`.
- Including active `SPECIAL_WORKDAY` rows, even if the date falls on Saturday or Sunday.

Do not insert normal Saturdays or Sundays into the database. Store only exceptions.

## Production DB Access

Use an SSH tunnel. Do not expose PostgreSQL publicly.

```bash
ssh -f -N -L 15432:127.0.0.1:5432 -o ExitOnForwardFailure=yes -i ~/.ssh/peas3_github_actions peas3@103.117.149.118
```

Check the tunnel:

```bash
lsof -nP -iTCP:15432 -sTCP:LISTEN
```

## Import Annual Holidays

Preferred path: Admin > ปฏิทินวันทำการ > CSV import.

CSV columns:

```csv
date,type,name,scope,note,isActive
2027-01-01,HOLIDAY,วันขึ้นปีใหม่,GLOBAL,Annual government holiday,true
```

Use `HOLIDAY` for non-working days and `SPECIAL_WORKDAY` for exceptional working days.

## Verify Data

```bash
npx prisma validate
npx prisma migrate status
```

Count active entries for a year:

```bash
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function dateOnlyUtc(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
(async () => {
  const year = '2026';
  const count = await prisma.businessCalendarDate.count({
    where: {
      scope: 'GLOBAL',
      isActive: true,
      date: {
        gte: dateOnlyUtc(`${year}-01-01`),
        lte: dateOnlyUtc(`${year}-12-31`),
      },
    },
  });
  console.log({ year, count });
})()
  .finally(async () => prisma.$disconnect());
NODE
```

## Rollback A Bad Import

Prefer deactivation over deletion when the date may be audited later:

```sql
UPDATE "BusinessCalendarDate"
SET "isActive" = false, "updatedAt" = NOW()
WHERE "scope" = 'GLOBAL'
  AND "date" BETWEEN DATE '2026-01-01' AND DATE '2026-12-31';
```

Delete only when the rows were clearly imported to the wrong environment or duplicated in the wrong scope.

## Post-Change Checks

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The build may query `/api/work-centers`, so keep the SSH DB tunnel open when building locally against production `.env`.
