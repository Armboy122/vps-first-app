import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outageHarness, row, KEY } from './helpers/outageHarness.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function harness() {
    const domain = outageHarness();
    const { AccessError } = domain.load('lib/server/auth/currentActor.ts');
    const { createApi } = domain.load('lib/server/api/app.ts');
    const useCases = domain.load('lib/modules/outages/application/useCases.ts');
    const ports = { async getActor() { if (!domain.state.session)
            throw new AccessError('UNAUTHENTICATED', 'sign in'); return domain.state.actor; }, outages: useCases, async workCenters() { return [{ id: 2, name: 'Synthetic' }]; }, async branches() { return [{ id: 5, shortName: 'Synthetic', workCenterId: 2 }]; }, async calendar() { return []; } };
    const app = createApi(ports);
    const call = (method, url, body, extra = {}) => app.handle(new Request(`https://preview.vercel.app/api/v1${url}`, { method, headers: { origin: 'https://preview.vercel.app', 'x-vps-client': 'web', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }));
    return { ...domain, ports, app, call };
}
test('actual Elysia prefix routes, JSON error shapes and unauthenticated access are bounded', async () => {
    const { call, state } = harness();
    state.session = false;
    for (const [method, url, body] of [['GET', '/me'], ['POST', '/outages', row()], ['POST', '/outages/import', { requests: [row()], idempotencyKey: KEY }]]) {
        const response = await call(method, url, body);
        assert.equal(response.status, 401);
        const json = await response.json();
        assert.equal(json.success, false);
        assert.equal(json.code, 'UNAUTHENTICATED');
        assert.equal(state.writeAttempts, 0);
    }
});
test('actual Elysia mutation handlers reject CSRF headers/content type before invoking ports', async () => {
    for (const headers of [{ origin: '' }, { origin: 'https://evil.example' }, { 'x-vps-client': '' }, { 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }]) {
        const { call, state, ports } = harness();
        let actors = 0;
        ports.getActor = async () => { actors++; return state.actor; };
        const response = await call('POST', '/outages', row(), headers);
        assert.ok([403, 415].includes(response.status));
        assert.equal(state.writeAttempts, 0);
        assert.equal(actors, 0);
        assert.equal((await response.json()).success, false);
    }
});
test('actual Elysia creation and idempotent import use shared guarded domain commands', async () => {
    const { call, state } = harness();
    state.actor.role = 'ADMIN';
    const initial = await call('POST', '/outages/import', { requests: [row(), row({ transformerNumber: 'TR2' })], idempotencyKey: KEY });
    assert.equal(initial.status, 200);
    const first = await initial.json();
    assert.equal(first.success, true);
    assert.equal(typeof first.data[0].outageDate, 'string');
    assert.equal(first.successCount, 2);
    const writes = state.writeAttempts;
    const retry = await (await call('POST', '/outages/import', { requests: [row(), row({ transformerNumber: 'TR2' })], idempotencyKey: KEY })).json();
    assert.deepEqual(retry.data.map((item) => item.id), first.data.map((item) => item.id));
    assert.equal(state.writeAttempts, writes);
    const changed = await call('POST', '/outages/import', { requests: [row({ area: 'changed' }), row({ transformerNumber: 'TR2' })], idempotencyKey: KEY });
    assert.equal(changed.status, 409);
    assert.equal((await changed.json()).success, false);
});
test('actual Elysia role/scope denial and schema failures write no rows', async () => {
    for (const change of ['VIEWER', 'foreign', 'invalid-date', 'invalid-time', 'bad-key']) {
        const { call, state } = harness();
        let data = row(), key = KEY;
        if (change === 'VIEWER')
            state.actor.role = 'VIEWER';
        if (change === 'foreign')
            data = row({ workCenterId: '3', branchId: '6' });
        if (change === 'invalid-date')
            data = row({ outageDate: '2026-02-30' });
        if (change === 'invalid-time')
            data = row({ endTime: '08:29' });
        if (change === 'bad-key')
            key = 'invalid';
        const response = await call('POST', '/outages/import', { requests: [data], idempotencyKey: key });
        assert.ok([403, 422].includes(response.status));
        assert.equal((await response.json()).success, false);
        assert.equal(state.writeAttempts, 0);
    }
});
test('actual Elysia status/OMS/edit/delete methods persist only authorized mutations', async () => {
    for (const mutation of ['edit', 'oms', 'status', 'delete']) {
        const { call, state } = harness();
        state.actor.role = 'ADMIN';
        state.rows.set(9, { id: 9, workCenterId: 2, branchId: 5, outageDate: new Date('2026-12-01'), startTime: new Date('2026-12-01T01:00:00Z'), endTime: new Date('2026-12-01T01:30:00Z'), statusRequest: 'CONFIRM', omsStatus: 'NOT_ADDED' });
        const response = mutation === 'delete' ? await call('DELETE', '/outages/9') : mutation === 'edit' ? await call('PATCH', '/outages/9', { outageDate: '2026-12-01', startTime: '09:00', endTime: '09:30', area: 'updated' }) : mutation === 'oms' ? await call('PATCH', '/outages/9/oms', { omsStatus: 'PROCESSED' }) : await call('PATCH', '/outages/9/status', { statusRequest: 'CANCELLED' });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).success, true);
        assert.equal(state.writeAttempts, 1);
    }
});
test('actual Elysia no-store and error sanitization never leak DB URL, password or stack', async () => {
    const { call, ports } = harness();
    ports.workCenters = async () => { throw new Error('postgresql://user:private-password@database/private stack'); };
    const response = await call('GET', '/work-centers');
    assert.equal(response.status, 500);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const text = await response.text();
    assert.ok(!text.includes('private-password'));
    assert.ok(!text.includes('postgresql'));
    assert.ok(!text.includes('stack'));
});
