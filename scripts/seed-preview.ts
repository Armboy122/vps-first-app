import {
  PREVIEW_BRANCHES,
  PREVIEW_CALENDAR_EXCEPTIONS,
  PREVIEW_OUTAGE_REQUESTS,
  PREVIEW_SEED_ACTOR_EMPLOYEE_ID,
  PREVIEW_TRANSFORMERS,
  PREVIEW_WORK_CENTERS,
} from "../prisma/fixtures/preview";
import { assertPreviewDatabaseTarget } from "../lib/server/config/previewBoundary";

export const PREVIEW_SEED_CONFIRMATION = "I_CONFIRM_PREVIEW_MOCK_SEED";

type SeedRecord = Record<string, unknown>;

interface UpsertDelegate {
  upsert(args: {
    where: SeedRecord;
    create: SeedRecord;
    update: SeedRecord;
  }): Promise<SeedRecord>;
}

interface PreviewActor {
  id: number;
  employeeId: string;
  role: string;
  workCenterId: number;
  branchId: number;
  workCenter?: { name: string } | null;
  branch?: { shortName: string; workCenterId: number } | null;
}

interface SeedTransactionClient {
  workCenter: UpsertDelegate;
  branch: UpsertDelegate;
  transformer: UpsertDelegate;
  businessCalendarDate: UpsertDelegate;
  powerOutageRequest: UpsertDelegate;
}

export interface PreviewSeedClient extends SeedTransactionClient {
  user: {
    findUnique(args: {
      where: { employeeId: string };
      select: SeedRecord;
    }): Promise<PreviewActor | null>;
  };
  $transaction<T>(
    callback: (transaction: SeedTransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T>;
  $disconnect?(): Promise<void>;
}

export interface PreviewSeedEnvironment {
  [key: string]: string | undefined;
  PREVIEW_SEED_DATABASE_URL?: string;
  PREVIEW_SEED_ENV?: string;
  PREVIEW_SEED_CONFIRM?: string;
  PREVIEW_SEED_ACTOR_EMPLOYEE_ID?: string;
  VERCEL_ENV?: string;
}

interface PreviewSeedOptions {
  env?: PreviewSeedEnvironment;
  args?: string[];
  prismaFactory?: (databaseUrl: string) => Promise<PreviewSeedClient>;
}

export interface PreviewSeedCounts {
  workCenters: number;
  branches: number;
  transformers: number;
  calendarExceptions: number;
  outageRequests: number;
  lookupOnly: boolean;
}

export class PreviewSeedRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewSeedRefusedError";
  }
}

function parseArguments(args: string[]): { lookupOnly: boolean } {
  if (args.length === 0) return { lookupOnly: false };
  if (args.length === 1 && args[0] === "--lookup-only") {
    return { lookupOnly: true };
  }
  throw new PreviewSeedRefusedError(
    "Preview seed refused: only the optional --lookup-only argument is supported.",
  );
}

/** Validate environment and exact target before creating a Prisma client. */
export function validatePreviewSeedEnvironment(
  env: PreviewSeedEnvironment,
): { databaseUrl: string; hostname: string; databaseName: string } {
  if (env.PREVIEW_SEED_ENV !== "preview") {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_ENV must equal preview.",
    );
  }

  // Preview deployments may still set NODE_ENV=production, so use VERCEL_ENV
  // when present and require a separate explicit preview opt-in above.
  if (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== "preview") {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: VERCEL_ENV, when set, must equal preview.",
    );
  }

  if (env.PREVIEW_SEED_CONFIRM !== PREVIEW_SEED_CONFIRMATION) {
    throw new PreviewSeedRefusedError(
      `Preview seed refused: PREVIEW_SEED_CONFIRM must equal ${PREVIEW_SEED_CONFIRMATION}.`,
    );
  }

  const databaseUrl = env.PREVIEW_SEED_DATABASE_URL;
  if (!databaseUrl) {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_DATABASE_URL is required; DATABASE_URL is never used as a fallback.",
    );
  }

  // Reuse the application's strict isolated-target guard as the single
  // authority for the host, database, TLS and routing-query allowlists.
  try {
    assertPreviewDatabaseTarget({
      APP_ENV: env.PREVIEW_SEED_ENV,
      VERCEL_ENV: env.VERCEL_ENV,
      DATABASE_URL: databaseUrl,
    });
  } catch {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: database target or connection options are outside the isolated preview allowlist.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_DATABASE_URL is malformed.",
    );
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
  } catch {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_DATABASE_URL has an invalid database path.",
    );
  }
  if (!parsedUrl.username || !parsedUrl.password) {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_DATABASE_URL must include database authentication.",
    );
  }

  return { databaseUrl, hostname: parsedUrl.hostname, databaseName };
}

function validateActor(actor: PreviewActor | null): PreviewActor {
  const actorHomeBranch = PREVIEW_BRANCHES.find((branch) => branch.isActorHome);
  const actorHomeCenter = PREVIEW_WORK_CENTERS[0];

  if (!actor) {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: the synthetic DEMO_ADMIN actor was not found. Use --lookup-only to seed only synthetic lookup fixtures.",
    );
  }

  if (
    actor.employeeId !== PREVIEW_SEED_ACTOR_EMPLOYEE_ID ||
    actor.role !== "ADMIN" ||
    actor.workCenter?.name !== actorHomeCenter.name ||
    actor.branch?.shortName !== actorHomeBranch?.shortName ||
    actor.branch?.workCenterId !== actor.workCenterId
  ) {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: DEMO_ADMIN must be an ADMIN assigned to the synthetic first work center and branch.",
    );
  }

  return actor;
}

function parseDateOnlyUtc(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Preview fixture contains a malformed date.");
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("Preview fixture contains an invalid date.");
  }
  return parsed;
}

function parseThailandDateTime(date: string, time: string): Date {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Preview fixture contains a malformed time.");
  }
  return new Date(`${date}T${time}:00+07:00`);
}

async function createPrismaClient(databaseUrl: string): Promise<PreviewSeedClient> {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  }) as unknown as PreviewSeedClient;
}

async function writePreviewFixtures(
  transaction: SeedTransactionClient,
  actor: PreviewActor | null,
  lookupOnly: boolean,
): Promise<Omit<PreviewSeedCounts, "lookupOnly">> {
  const workCenterIds = new Map<string, number>();
  for (const workCenter of PREVIEW_WORK_CENTERS) {
    const record = await transaction.workCenter.upsert({
      where: { name: workCenter.name },
      create: { name: workCenter.name },
      // Preserve any manual edits to already-created demo rows on rerun.
      update: {},
    });
    if (typeof record.id !== "number") {
      throw new Error("Preview work center upsert returned no numeric id.");
    }
    workCenterIds.set(workCenter.name, record.id);
  }

  const branchIds = new Map<string, number>();
  for (const branch of PREVIEW_BRANCHES) {
    const workCenterId = workCenterIds.get(branch.workCenterName);
    if (workCenterId === undefined) {
      throw new Error("Preview fixture references an unknown work center.");
    }
    const record = await transaction.branch.upsert({
      where: {
        workCenterId_shortName: {
          workCenterId,
          shortName: branch.shortName,
        },
      },
      create: {
        workCenterId,
        shortName: branch.shortName,
        fullName: branch.fullName,
        phoneNumber: branch.phoneNumber,
      },
      update: {},
    });
    if (typeof record.id !== "number") {
      throw new Error("Preview branch upsert returned no numeric id.");
    }
    branchIds.set(`${branch.workCenterName}/${branch.shortName}`, record.id);
  }

  for (const transformer of PREVIEW_TRANSFORMERS) {
    await transaction.transformer.upsert({
      where: { transformerNumber: transformer.transformerNumber },
      create: transformer,
      update: {},
    });
  }

  for (const entry of PREVIEW_CALENDAR_EXCEPTIONS) {
    const date = parseDateOnlyUtc(entry.date);
    await transaction.businessCalendarDate.upsert({
      where: { date_scope: { date, scope: entry.scope } },
      create: { ...entry, date },
      update: {},
    });
  }

  let outageRequests = 0;
  if (!lookupOnly && actor) {
    const actorBranch = PREVIEW_BRANCHES.find((branch) => branch.isActorHome);
    const workCenterId = workCenterIds.get(PREVIEW_WORK_CENTERS[0].name);
    const branchId = actorBranch
      ? branchIds.get(`${actorBranch.workCenterName}/${actorBranch.shortName}`)
      : undefined;

    if (
      workCenterId !== actor.workCenterId ||
      branchId !== actor.branchId
    ) {
      throw new Error("Preview actor organization keys do not match seeded records.");
    }

    for (const request of PREVIEW_OUTAGE_REQUESTS) {
      await transaction.powerOutageRequest.upsert({
        where: { seedKey: request.seedKey },
        create: {
          seedKey: request.seedKey,
          outageDate: parseDateOnlyUtc(request.outageDate),
          startTime: parseThailandDateTime(request.outageDate, request.startTime),
          endTime: parseThailandDateTime(request.outageDate, request.endTime),
          workCenterId,
          branchId,
          transformerNumber: request.transformerNumber,
          gisDetails: request.gisDetails,
          area: request.area,
          createdById: actor.id,
          statusRequest: request.statusRequest,
          omsStatus: request.omsStatus,
        },
        // Never overwrite user edits to an already-created demo request.
        update: {},
      });
      outageRequests += 1;
    }
  }

  return {
    workCenters: PREVIEW_WORK_CENTERS.length,
    branches: PREVIEW_BRANCHES.length,
    transformers: PREVIEW_TRANSFORMERS.length,
    calendarExceptions: PREVIEW_CALENDAR_EXCEPTIONS.length,
    outageRequests,
  };
}

export async function runPreviewSeed({
  env = process.env,
  args = [],
  prismaFactory = createPrismaClient,
}: PreviewSeedOptions = {}): Promise<PreviewSeedCounts> {
  const { lookupOnly } = parseArguments(args);
  const { databaseUrl } = validatePreviewSeedEnvironment(env);

  if (!lookupOnly && env.PREVIEW_SEED_ACTOR_EMPLOYEE_ID !== PREVIEW_SEED_ACTOR_EMPLOYEE_ID) {
    throw new PreviewSeedRefusedError(
      "Preview seed refused: PREVIEW_SEED_ACTOR_EMPLOYEE_ID must equal DEMO_ADMIN. Use --lookup-only before the synthetic actor is provisioned.",
    );
  }

  const prisma = await prismaFactory(databaseUrl);
  try {
    const actor = lookupOnly
      ? null
      : validateActor(
          await prisma.user.findUnique({
            where: { employeeId: PREVIEW_SEED_ACTOR_EMPLOYEE_ID },
            select: {
              id: true,
              employeeId: true,
              role: true,
              workCenterId: true,
              branchId: true,
              workCenter: { select: { name: true } },
              branch: { select: { shortName: true, workCenterId: true } },
            },
          }),
        );

    const counts = await prisma.$transaction(
      (transaction) => writePreviewFixtures(transaction, actor, lookupOnly),
      { maxWait: 10_000, timeout: 120_000 },
    );
    return { ...counts, lookupOnly };
  } finally {
    await prisma.$disconnect?.();
  }
}

function isDirectInvocation(): boolean {
  const entrypoint = process.argv[1]?.replaceAll("\\", "/") ?? "";
  return entrypoint.endsWith("scripts/seed-preview.ts");
}

if (isDirectInvocation()) {
  void runPreviewSeed({ args: process.argv.slice(2) })
    .then((counts) => {
      console.log("Synthetic preview seed complete:", counts);
    })
    .catch((error: unknown) => {
      const message =
        error instanceof PreviewSeedRefusedError
          ? error.message
          : "Preview seed failed; connection details were omitted from output.";
      console.error(message);
      process.exitCode = 1;
    });
}
