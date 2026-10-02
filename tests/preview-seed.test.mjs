import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = createTypescriptLoader(root);
const seedModule = load('scripts/seed-preview.ts');
const fixtures = load('prisma/fixtures/preview.ts');
const {
  PREVIEW_CALENDAR_EXCEPTIONS,
  PREVIEW_FIXTURE_COUNTS,
  PREVIEW_FIXTURE_DATE_ANCHOR,
  PREVIEW_OUTAGE_REQUESTS,
  PREVIEW_SEED_ACTOR_EMPLOYEE_ID,
  PREVIEW_WORK_CENTERS,
  PREVIEW_BRANCHES,
} = fixtures;
const {
  PREVIEW_SEED_CONFIRMATION,
  PreviewSeedRefusedError,
  runPreviewSeed,
  validatePreviewSeedEnvironment,
} = seedModule;

const DIRECT_HOST = 'ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech';
const POOLER_HOST = 'ep-odd-paper-azxfykgo-pooler.c-3.ap-southeast-1.aws.neon.tech';
const ALLOWED_DATABASE_URL = `postgresql://preview_user:mock-only-not-a-secret@${DIRECT_HOST}/vps_tr_mock?sslmode=require`;

function baseEnvironment(overrides = {}) {
  return {
    PREVIEW_SEED_ENV: 'preview',
    PREVIEW_SEED_CONFIRM: PREVIEW_SEED_CONFIRMATION,
    PREVIEW_SEED_DATABASE_URL: ALLOWED_DATABASE_URL,
    PREVIEW_SEED_ACTOR_EMPLOYEE_ID: PREVIEW_SEED_ACTOR_EMPLOYEE_ID,
    VERCEL_ENV: 'preview',
    ...overrides,
  };
}

function makeActor(overrides = {}) {
  return {
    id: 501,
    employeeId: PREVIEW_SEED_ACTOR_EMPLOYEE_ID,
    role: 'ADMIN',
    workCenterId: 1,
    branchId: 1,
    workCenter: { name: 'ศูนย์ทดสอบ01' },
    branch: { shortName: 'สาขาทดสอบ01', workCenterId: 1 },
    ...overrides,
  };
}

function createMockPrisma({ actor = makeActor() } = {}) {
  const state = {
    userReads: 0,
    transactionCalls: 0,
    transactionOptions: [],
    disconnectCalls: 0,
    factoryCalls: 0,
    factoryUrls: [],
    userWriteCalls: 0,
    upsertArgs: {
      workCenter: [],
      branch: [],
      transformer: [],
      businessCalendarDate: [],
      powerOutageRequest: [],
    },
    rows: {
      workCenter: new Map(),
      branch: new Map(),
      transformer: new Map(),
      businessCalendarDate: new Map(),
      powerOutageRequest: new Map(),
    },
  };

  const keyFor = {
    workCenter: (where) => where.name,
    branch: (where) => `${where.workCenterId_shortName.workCenterId}/${where.workCenterId_shortName.shortName}`,
    transformer: (where) => where.transformerNumber,
    businessCalendarDate: (where) => `${where.date_scope.date.toISOString()}/${where.date_scope.scope}`,
    powerOutageRequest: (where) => where.seedKey,
  };

  const makeDelegate = (model) => ({
    async upsert(args) {
      state.upsertArgs[model].push(args);
      const key = keyFor[model](args.where);
      const existing = state.rows[model].get(key);
      if (existing) {
        // Model Prisma's update: {} behavior: preserve an existing edited demo row.
        assert.deepEqual(args.update, {});
        return existing;
      }

      const record = { id: state.rows[model].size + 1, ...args.create };
      state.rows[model].set(key, record);
      return record;
    },
  });

  const transactionClient = {
    workCenter: makeDelegate('workCenter'),
    branch: makeDelegate('branch'),
    transformer: makeDelegate('transformer'),
    businessCalendarDate: makeDelegate('businessCalendarDate'),
    powerOutageRequest: makeDelegate('powerOutageRequest'),
  };

  const prisma = {
    ...transactionClient,
    user: {
      async findUnique(args) {
        state.userReads++;
        assert.deepEqual(args.where, { employeeId: PREVIEW_SEED_ACTOR_EMPLOYEE_ID });
        return actor;
      },
    },
    async $transaction(callback, options) {
      state.transactionCalls++;
      state.transactionOptions.push(options);
      return callback(transactionClient);
    },
    async $disconnect() {
      state.disconnectCalls++;
    },
  };

  async function prismaFactory(databaseUrl) {
    state.factoryCalls++;
    state.factoryUrls.push(databaseUrl);
    return prisma;
  }

  return { state, prisma, prismaFactory };
}

test('fixture graph is deterministic, synthetic, and complete for the preview contract', () => {
  assert.equal(PREVIEW_WORK_CENTERS.length, PREVIEW_FIXTURE_COUNTS.workCenters);
  assert.equal(PREVIEW_BRANCHES.length, PREVIEW_FIXTURE_COUNTS.branches);
  assert.deepEqual(PREVIEW_WORK_CENTERS[0], { name: 'ศูนย์ทดสอบ01' });
  assert.equal(PREVIEW_WORK_CENTERS.at(-1).name, 'ศูนย์ทดสอบ13');
  assert.equal(PREVIEW_BRANCHES.at(-1).shortName, 'สาขาทดสอบ06');
  assert.equal(PREVIEW_SEED_ACTOR_EMPLOYEE_ID, 'DEMO_ADMIN');
  assert.equal(PREVIEW_FIXTURE_DATE_ANCHOR, '2026-10-01');
  assert.deepEqual(PREVIEW_OUTAGE_REQUESTS[0], {
    seedKey: 'preview-20261001-outage-01',
    outageDate: '2026-10-13',
    startTime: '08:00',
    endTime: '09:30',
    transformerNumber: 'DEMO_TR001',
    gisDetails: 'ตำแหน่งทดสอบ DEMO_TR001',
    area: 'พื้นที่ทดสอบ 01',
    statusRequest: 'CONFIRM',
    omsStatus: 'NOT_ADDED',
  });
  assert.ok(PREVIEW_OUTAGE_REQUESTS.some((request) => request.outageDate < PREVIEW_FIXTURE_DATE_ANCHOR));
  assert.ok(PREVIEW_OUTAGE_REQUESTS.some((request) => request.outageDate === PREVIEW_FIXTURE_DATE_ANCHOR));
  assert.ok(PREVIEW_OUTAGE_REQUESTS.some((request) => request.outageDate > '2026-10-12'));
  assert.ok(PREVIEW_OUTAGE_REQUESTS.filter((request) =>
    request.statusRequest === 'CONFIRM' &&
    request.omsStatus === 'NOT_ADDED' &&
    request.outageDate > PREVIEW_FIXTURE_DATE_ANCHOR,
  ).length >= 3);
  assert.equal(
    new Set(PREVIEW_OUTAGE_REQUESTS.map((request) => `${request.statusRequest}/${request.omsStatus}`)).size,
    9,
  );
  assert.equal(PREVIEW_CALENDAR_EXCEPTIONS.length, PREVIEW_FIXTURE_COUNTS.calendarExceptions);
  assert.ok(PREVIEW_CALENDAR_EXCEPTIONS.every((date) => date.scope === 'GLOBAL'));
});

test('safety guard accepts only the two exact preview Neon hosts and database name', () => {
  assert.equal(validatePreviewSeedEnvironment(baseEnvironment()).hostname, DIRECT_HOST);
  assert.equal(
    validatePreviewSeedEnvironment(baseEnvironment({
      PREVIEW_SEED_DATABASE_URL: `postgresql://preview_user:mock-only-not-a-secret@${POOLER_HOST}/vps_tr_mock?sslmode=require`,
    })).hostname,
    POOLER_HOST,
  );

  for (const databaseUrl of [
    `postgresql://user:pass@evil.neon.tech/vps_tr_mock`,
    `postgresql://user:pass@${DIRECT_HOST}/postgres`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock/other`,
    `postgresql://user:pass@${DIRECT_HOST}:5555/vps_tr_mock?sslmode=require`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require#other`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&host=%2Ftmp%2Fother-db`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&hostaddr=127.0.0.1`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&port=5555`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&dbname=other`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&database=other`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&service=other`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&socket=%2Ftmp`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&sslaccept=accept_invalid_certs`,
    `postgresql://user:pass@${DIRECT_HOST}/vps_tr_mock?sslmode=require&sslmode=disable`,
    `mysql://user:pass@${DIRECT_HOST}/vps_tr_mock`,
    `not-a-url-${DIRECT_HOST}/vps_tr_mock`,
  ]) {
    assert.throws(
      () => validatePreviewSeedEnvironment(baseEnvironment({ PREVIEW_SEED_DATABASE_URL: databaseUrl })),
      PreviewSeedRefusedError,
    );
  }
});

test('missing or invalid safety settings refuse before the Prisma client is constructed', async () => {
  const invalidEnvironments = [
    baseEnvironment({ PREVIEW_SEED_ENV: undefined }),
    baseEnvironment({ PREVIEW_SEED_ENV: 'production' }),
    baseEnvironment({ PREVIEW_SEED_CONFIRM: undefined }),
    baseEnvironment({ PREVIEW_SEED_CONFIRM: 'yes' }),
    baseEnvironment({ PREVIEW_SEED_DATABASE_URL: undefined, DATABASE_URL: ALLOWED_DATABASE_URL }),
    baseEnvironment({ PREVIEW_SEED_ACTOR_EMPLOYEE_ID: undefined }),
    baseEnvironment({ PREVIEW_SEED_ACTOR_EMPLOYEE_ID: 'REAL_EMPLOYEE' }),
    baseEnvironment({ VERCEL_ENV: 'production' }),
    baseEnvironment({ VERCEL_ENV: 'development' }),
    baseEnvironment({ VERCEL_ENV: 'unknown' }),
  ];

  for (const env of invalidEnvironments) {
    const mock = createMockPrisma();
    await assert.rejects(
      runPreviewSeed({ env, prismaFactory: mock.prismaFactory }),
      PreviewSeedRefusedError,
    );
    assert.equal(mock.state.factoryCalls, 0);
    assert.equal(mock.state.transactionCalls, 0);
    assert.equal(Object.values(mock.state.upsertArgs).flat().length, 0);
  }
});

test('explicit local preview opt-in works without VERCEL_ENV', () => {
  const env = baseEnvironment();
  delete env.VERCEL_ENV;
  assert.equal(validatePreviewSeedEnvironment(env).databaseName, 'vps_tr_mock');
});

test('missing, non-admin, or wrong-scope actor fails before all writes', async () => {
  const actorCases = [
    null,
    makeActor({ role: 'USER' }),
    makeActor({ workCenter: { name: 'ศูนย์จริง01' } }),
    makeActor({ branch: { shortName: 'สาขาจริง01', workCenterId: 1 } }),
    makeActor({ branch: { shortName: 'สาขาทดสอบ01', workCenterId: 999 } }),
  ];

  for (const actor of actorCases) {
    const mock = createMockPrisma({ actor });
    await assert.rejects(
      runPreviewSeed({ env: baseEnvironment(), prismaFactory: mock.prismaFactory }),
      PreviewSeedRefusedError,
    );
    assert.equal(mock.state.userReads, 1);
    assert.equal(mock.state.transactionCalls, 0);
    assert.equal(Object.values(mock.state.upsertArgs).flat().length, 0);
    assert.equal(mock.state.userWriteCalls, 0);
  }
});

test('--lookup-only seeds safe lookups without requiring or writing a user or outage request', async () => {
  const env = baseEnvironment({ PREVIEW_SEED_ACTOR_EMPLOYEE_ID: undefined });
  const mock = createMockPrisma({ actor: null });
  const counts = await runPreviewSeed({
    env,
    args: ['--lookup-only'],
    prismaFactory: mock.prismaFactory,
  });

  assert.deepEqual(counts, {
    workCenters: 13,
    branches: 66,
    transformers: 30,
    calendarExceptions: 4,
    outageRequests: 0,
    lookupOnly: true,
  });
  assert.equal(mock.state.userReads, 0);
  assert.equal(mock.state.transactionCalls, 1);
  assert.deepEqual(mock.state.transactionOptions, [{ maxWait: 10_000, timeout: 120_000 }]);
  assert.equal(mock.state.rows.workCenter.size, 13);
  assert.equal(mock.state.rows.branch.size, 66);
  assert.equal(mock.state.rows.transformer.size, 30);
  assert.equal(mock.state.rows.businessCalendarDate.size, 4);
  assert.equal(mock.state.rows.powerOutageRequest.size, 0);
  assert.equal(mock.state.userWriteCalls, 0);
  assert.equal(mock.state.factoryUrls[0], ALLOWED_DATABASE_URL);
});

test('full seed is scoped to the synthetic admin and reruns are idempotent without overwriting demo edits', async () => {
  const mock = createMockPrisma();
  const env = baseEnvironment();
  const first = await runPreviewSeed({ env, prismaFactory: mock.prismaFactory });
  const editedRequest = mock.state.rows.powerOutageRequest.get('preview-20261001-outage-01');
  editedRequest.area = 'operator-edited synthetic area';

  const second = await runPreviewSeed({ env, prismaFactory: mock.prismaFactory });

  assert.deepEqual(first, {
    workCenters: 13,
    branches: 66,
    transformers: 30,
    calendarExceptions: 4,
    outageRequests: 30,
    lookupOnly: false,
  });
  assert.deepEqual(second, first);
  assert.equal(mock.state.rows.workCenter.size, 13);
  assert.equal(mock.state.rows.branch.size, 66);
  assert.equal(mock.state.rows.transformer.size, 30);
  assert.equal(mock.state.rows.businessCalendarDate.size, 4);
  assert.equal(mock.state.rows.powerOutageRequest.size, 30);
  assert.equal(editedRequest.area, 'operator-edited synthetic area');
  assert.equal(mock.state.userReads, 2);
  assert.equal(mock.state.transactionCalls, 2);
  assert.deepEqual(mock.state.transactionOptions, [
    { maxWait: 10_000, timeout: 120_000 },
    { maxWait: 10_000, timeout: 120_000 },
  ]);
  assert.equal(mock.state.userWriteCalls, 0);
  assert.equal(mock.state.disconnectCalls, 2);

  const createdRequests = mock.state.upsertArgs.powerOutageRequest.map((args) => args.create);
  assert.equal(createdRequests.length, 60);
  assert.ok(createdRequests.every((row) => row.createdById === 501));
  assert.ok(createdRequests.every((row) => row.workCenterId === 1 && row.branchId === 1));
  assert.ok(createdRequests.every((row) => typeof row.seedKey === 'string'));
  assert.ok(createdRequests.every((row) => !Object.hasOwn(row, 'password')));
  assert.ok(Object.values(mock.state.upsertArgs).flat().every((args) => Object.keys(args.update).length === 0));
});

test('unknown CLI options refuse before constructing Prisma', async () => {
  const mock = createMockPrisma();
  await assert.rejects(
    runPreviewSeed({ env: baseEnvironment(), args: ['--apply'], prismaFactory: mock.prismaFactory }),
    PreviewSeedRefusedError,
  );
  assert.equal(mock.state.factoryCalls, 0);
  assert.equal(mock.state.transactionCalls, 0);
});
