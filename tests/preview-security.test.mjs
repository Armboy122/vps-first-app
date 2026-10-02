import test from 'node:test';
import assert from 'node:assert/strict';
import { canReadWorkCenter, canMutateOutage } from '../lib/modules/outages/domain/authorization.ts';
import { assertPreviewDatabaseTarget } from '../lib/server/config/previewBoundary.ts';
const actor = (role) => ({ id: 1, employeeId: 'DEMO', fullName: 'Synthetic', role, workCenterId: 2, branchId: 5 });
for (const role of ['ADMIN', 'VIEWER', 'USER', 'MANAGER', 'SUPERVISOR'])
    test(`scope and mutation policy for ${role}`, () => {
        assert.equal(canReadWorkCenter(actor(role), 2), true);
        assert.equal(canReadWorkCenter(actor(role), 3), ['ADMIN', 'VIEWER'].includes(role));
        for (const mutation of ['edit', 'delete', 'request-status', 'oms']) {
            assert.equal(canMutateOutage(actor(role), { workCenterId: 3, branchId: 6 }, mutation), role === 'ADMIN');
            const allowed = role === 'ADMIN' || (mutation === 'oms' ? role === 'SUPERVISOR' : role === 'USER');
            assert.equal(canMutateOutage(actor(role), { workCenterId: 2, branchId: 5 }, mutation), allowed);
        }
    });
test('preview boundary refuses production/unknown DB targets without revealing credentials', () => {
    const valid = { APP_ENV: 'preview', VERCEL_ENV: 'preview', DATABASE_URL: 'postgresql://secret-user:secret-password@ep-odd-paper-azxfykgo-pooler.c-3.ap-southeast-1.aws.neon.tech/vps_tr_mock?sslmode=require' };
    assert.doesNotThrow(() => assertPreviewDatabaseTarget(valid));
    for (const bad of [{ APP_ENV: undefined }, { VERCEL_ENV: 'production' }, { DATABASE_URL: 'postgresql://secret-user:secret-password@example.com/vps_tr_mock' }, { DATABASE_URL: valid.DATABASE_URL.replace('vps_tr_mock', 'vps_production') }, { DATABASE_URL: 'malformed' }]) {
        assert.throws(() => assertPreviewDatabaseTarget({ ...valid, ...bad }), (error) => !error.message.includes('secret-password') && !error.message.includes('secret-user'));
    }
});
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';
import { outageHarness, row } from './helpers/outageHarness.mjs';
import { configurePreviewAuthUrl } from '../lib/server/config/authUrl.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const role of ['ADMIN', 'VIEWER', 'USER', 'MANAGER', 'SUPERVISOR']) {
    for (const mutation of ['edit', 'delete', 'request-status', 'oms'])
        test(`legacy ${mutation} Action checks fresh ${role} role/scope before writes`, async () => {
            for (const center of [2, 3]) {
                const { state, actions } = outageHarness();
                state.actor.role = role;
                state.rows.set(9, { id: 9, workCenterId: center, branchId: center === 2 ? 5 : 6, createdById: 1, outageDate: new Date('2026-12-01'), startTime: new Date('2026-12-01T01:00:00Z'), endTime: new Date('2026-12-01T01:30:00Z'), statusRequest: 'CONFIRM', omsStatus: 'NOT_ADDED' });
                const allowed = role === 'ADMIN' || (center === 2 && (mutation === 'oms' ? role === 'SUPERVISOR' : role === 'USER'));
                const result = mutation === 'edit' ? await actions.updatePowerOutageRequest(9, row()) : mutation === 'delete' ? await actions.deletePowerOutageRequest(9) : mutation === 'oms' ? await actions.updateOMS(9, 'PROCESSED') : await actions.updateStatusRequest(9, 'CANCELLED');
                assert.equal(result.success, allowed);
                assert.equal(state.writeAttempts, allowed ? 1 : 0);
            }
        });
}
test('immutable session ID resolves actor despite reused employee ID/stale JWT role', async () => {
    const user = { ...actor('USER'), employeeId: 'RENAMED' };
    let session = { user: { id: '1', employeeId: 'REUSED', role: 'ADMIN' } };
    const services = { UserService: { async getUserById(id) { return id === 1 ? user : null; }, async getUserByEmployeeId() { throw new Error('mutable identity lookup is prohibited'); } } };
    const load = createTypescriptLoader(root, { '@/lib/services': services, 'next-auth': { async getServerSession() { return session; } }, '@/authOption': { authOptions: {} } });
    const auth = load('lib/server/auth/currentActor.ts');
    assert.equal((await auth.getCurrentActor()).role, 'USER');
    assert.equal((await auth.getCurrentActor()).employeeId, 'RENAMED');
    user.role = 'VIEWER';
    assert.equal((await auth.getCurrentActor()).role, 'VIEWER');
    session = { user: { id: '9', employeeId: 'REUSED' } };
    await assert.rejects(auth.getCurrentActor(), /ไม่พบ/);
});
test('legacy admin/profile mutations deny role forgery, unauthenticated callers and scope self-assignment', async () => {
    const state = { session: true, role: 'USER', writes: 0, reads: 0 };
    const ports = { user: { async create() { state.writes++; return {}; }, async update() { state.writes++; return {}; }, async delete() { state.writes++; return {}; }, async findUnique() { state.reads++; return null; } }, transformer: { async create() { state.writes++; return {}; }, async update() { state.writes++; return {}; }, async delete() { state.writes++; return {}; } } };
    const auth = { async getCurrentActor() { if (!state.session)
            throw new Error('no session'); return actor(state.role); }, async requireAdmin() { if (!state.session || state.role !== 'ADMIN')
            throw new Error('forbidden'); return actor(state.role); } };
    const load = createTypescriptLoader(root, { '../../../lib/prisma': ports, '@/lib/server/auth/currentActor': auth, 'next-auth/next': { async getServerSession() { return { user: { id: '1', role: 'ADMIN' } }; } }, '@/authOption': { authOptions: {} } });
    const actions = load('app/api/action/User.ts');
    for (const invoke of [() => actions.createUser({}), () => actions.updateUserRole(9, 'ADMIN'), () => actions.updateUserName(9, 'name'), () => actions.deleteUser(9), () => actions.createTransformer({ transformerNumber: 'TR1', gisDetails: 'GIS' }), () => actions.updateTransformer(9, { transformerNumber: 'TR1', gisDetails: 'GIS' }), () => actions.deleteTransformer(9), () => actions.resetUserPassword(9), () => actions.bulkUpsertTransformers([{ transformerNumber: 'TR1', gisDetails: 'GIS' }])]) {
        const result = await invoke();
        assert.equal(result.success, false);
        assert.equal(state.writes, 0);
    }
    state.session = false;
    assert.equal((await actions.updateUserRole(9, 'ADMIN')).success, false);
    assert.equal((await actions.createTransformer({ transformerNumber: 'TR1', gisDetails: 'GIS' })).success, false);
    assert.equal(state.writes, 0);
    state.session = true;
    assert.equal((await actions.updateUserProfile({ workCenterId: 3, branchId: 6 })).success, false);
    assert.equal(state.writes, 0);
    assert.equal(state.reads, 0);
    state.role = 'ADMIN';
    assert.equal((await actions.resetUserPassword(9)).success, false);
    assert.equal(state.writes, 0);
});
test('preview blocks Apps Script before fetch even if a production URL is configured', async () => {
    const oldEnv = process.env.APP_ENV, oldUrl = process.env.NEXT_PUBLIC_GENERATE_PDF, oldFetch = globalThis.fetch;
    let fetches = 0;
    process.env.APP_ENV = 'preview';
    process.env.NEXT_PUBLIC_GENERATE_PDF = 'https://script.google.com/production';
    globalThis.fetch = async () => { fetches++; throw new Error('must never call production'); };
    try {
        const load = createTypescriptLoader(root, { '@/lib/server/auth/currentActor': { async getCurrentActor() { return actor('ADMIN'); } } });
        const action = load('app/api/action/generatePdf.ts');
        assert.equal((await action.generatePdf({ peaNo: 'fake', name: 'fake', cutoffDate: '2026-12-01', annouceDate: '2026-11-20', tel: '' })).success, false);
        assert.equal(fetches, 0);
    }
    finally {
        globalThis.fetch = oldFetch;
        if (oldEnv === undefined)
            delete process.env.APP_ENV;
        else
            process.env.APP_ENV = oldEnv;
        if (oldUrl === undefined)
            delete process.env.NEXT_PUBLIC_GENERATE_PDF;
        else
            process.env.NEXT_PUBLIC_GENERATE_PDF = oldUrl;
    }
});
test('authentication callback URL derives only from the exact platform vercel.app host form', () => {
    const env = { APP_ENV: 'preview', VERCEL_BRANCH_URL: 'vps-tr-preview-git-preview.vercel.app' };
    configurePreviewAuthUrl(env);
    assert.equal(env.NEXTAUTH_URL, 'https://vps-tr-preview-git-preview.vercel.app');
    for (const alias of ['https://evil.example', 'evil.vercel.app.evil.example', 'user@preview.vercel.app', 'preview.vercel.app/path'])
        assert.throws(() => configurePreviewAuthUrl({ APP_ENV: 'preview', VERCEL_BRANCH_URL: alias }));
});
test('outage read Action forces current center scope and refuses a forged foreign filter', async () => {
    for (const role of ['ADMIN', 'VIEWER', 'USER', 'MANAGER', 'SUPERVISOR']) {
        const { state, actions, service } = outageHarness();
        state.actor.role = role;
        const calls = [];
        service.getPaginatedRequests = async (page, filters) => { calls.push(filters); return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }; };
        service.sortRequests = (rows) => rows;
        await actions.getPowerOutageRequests();
        assert.deepEqual(calls[0], ['ADMIN', 'VIEWER'].includes(role) ? {} : { workCenterId: 2 });
        if (['ADMIN', 'VIEWER'].includes(role))
            await actions.getPowerOutageRequests(1, 50, { workCenterId: 3 });
        else
            await assert.rejects(actions.getPowerOutageRequests(1, 50, { workCenterId: 3 }), /ไม่มีสิทธิ์/);
        state.session = false;
        const before = calls.length;
        await assert.rejects(actions.getPowerOutageRequests());
        assert.equal(calls.length, before);
    }
});
test('legacy lookup, print and calendar boundaries deny anonymous and foreign reads/writes', async () => {
    const state = { session: true, role: 'USER', reads: 0, writes: 0 };
    const current = { async getCurrentActor() { if (!state.session)
            throw new Error('anonymous'); return actor(state.role); }, async requireAdmin() { if (!state.session || state.role !== 'ADMIN')
            throw new Error('forbidden'); return actor(state.role); } };
    const prisma = { workCenter: { async findMany({ where }) { state.reads++; assert.equal(where.id, 2); return [{ id: 2, name: 'own' }]; } }, branch: { async findMany() { state.reads++; return []; } }, powerOutageRequest: { async findMany() { state.reads++; return []; } }, businessCalendarDate: { async upsert() { state.writes++; return {}; } } };
    const load = createTypescriptLoader(root, { '@/lib/server/auth/currentActor': current, '../../../lib/prisma': prisma, '@/lib/prisma': prisma });
    const lookups = load('app/api/action/getWorkCentersAndBranches.ts');
    assert.equal((await lookups.getWorkCenters()).length, 1);
    const reads = state.reads;
    await assert.rejects(lookups.getBranches(3));
    assert.equal(state.reads, reads);
    const print = load('app/api/action/printAnnoucement.ts');
    assert.deepEqual(await print.getDataforPrintAnnouncement({ workCenterId: '3', branchId: '6', outageDate: '2026-12-01' }), []);
    assert.equal(state.reads, reads);
    const calendar = load('app/api/action/businessCalendar.ts');
    assert.equal((await calendar.bulkImportBusinessCalendarDates([{ date: '2026-12-01', type: 'HOLIDAY', name: 'holiday' }])).success, false);
    assert.equal(state.writes, 0);
    state.session = false;
    await assert.rejects(lookups.getWorkCenters());
    assert.equal(state.reads, reads);
    assert.deepEqual(await print.getDataforPrintAnnouncement({ workCenterId: '2', branchId: '5', outageDate: '2026-12-01' }), []);
    assert.equal(state.reads, reads);
});
test('Prisma validates target before construction and build client can never inherit a live URL', () => {
    const saved = { APP_ENV: process.env.APP_ENV, VERCEL_ENV: process.env.VERCEL_ENV, DATABASE_URL: process.env.DATABASE_URL, NEXT_PHASE: process.env.NEXT_PHASE };
    let constructed = 0, options, queryGuard;
    class FakePrisma {
        constructor(value) { constructed++; options = value; }
        $use(callback) { queryGuard = callback; }
    }
    try {
        process.env.APP_ENV = 'preview';
        process.env.VERCEL_ENV = 'preview';
        process.env.DATABASE_URL = 'postgresql://private-user:private-password@unknown.example/production';
        delete process.env.NEXT_PHASE;
        assert.throws(() => createTypescriptLoader(root, { '@prisma/client': { PrismaClient: FakePrisma } })('lib/prisma.ts'));
        assert.equal(constructed, 0);
        process.env.NEXT_PHASE = 'phase-production-build';
        createTypescriptLoader(root, { '@prisma/client': { PrismaClient: FakePrisma } })('lib/prisma.ts');
        assert.equal(constructed, 1);
        assert.match(options.datasources.db.url, /disconnected_build/);
        assert.ok(!options.datasources.db.url.includes('unknown.example'));
    }
    finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined)
                delete process.env[key];
            else
                process.env[key] = value;
        }
    }
});
test('shared database guard rejects alternate routing, duplicate parameters and insecure TLS', () => {
    const base = 'postgresql://synthetic:dry-only@ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech/vps_tr_mock?sslmode=require';
    for (const suffix of ['&host=%2Ftmp%2Fother-db', '&hostaddr=127.0.0.1', '&options=endpoint%3Dep-other', '&schema=public&schema=other', '&sslmode=disable', '&service=other', '&socket=/tmp', '&unknown=true'])
        assert.throws(() => assertPreviewDatabaseTarget({ APP_ENV: 'preview', VERCEL_ENV: 'preview', DATABASE_URL: base + suffix }));
    assert.throws(() => assertPreviewDatabaseTarget({ APP_ENV: 'preview', DATABASE_URL: base.replace(':dry-only@', ':dry-only@').replace('/vps_tr_mock?', ':5555/vps_tr_mock?') }));
});
test('calendar count handles distant valid dates without iterating every calendar day', async () => {
    const load = createTypescriptLoader(root, { '@/lib/prisma': { businessCalendarDate: { async findMany() { return []; } } } });
    const { BusinessCalendarService } = load('lib/services/businessCalendar.service.ts');
    const start = '2026-10-01', end = '9999-12-31';
    const count = await BusinessCalendarService.countBusinessDaysBetween(start, end);
    assert.ok(count > 2000000);
    assert.ok(count < 3000000);
});
