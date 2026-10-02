import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outageHarness, row, KEY } from './helpers/outageHarness.mjs';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';
import { uploadTransformerRows } from '../lib/services/transformerUpload.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const kind of ['single', 'bulk']) {
    for (const denial of ['anonymous', 'VIEWER', 'MANAGER', 'SUPERVISOR', 'foreign-center', 'foreign-branch', 'invalid-pair']) {
        test(`actual ${kind} Action denies ${denial} with zero writes`, async () => {
            const { state, actions } = outageHarness();
            let input = row();
            if (denial === 'anonymous')
                state.session = false;
            else if (['VIEWER', 'MANAGER', 'SUPERVISOR'].includes(denial))
                state.actor.role = denial;
            else if (denial === 'foreign-center')
                input = row({ workCenterId: '3' });
            else if (denial === 'foreign-branch')
                input = row({ branchId: '6' });
            else {
                state.actor.role = 'ADMIN';
                input = row({ workCenterId: '3', branchId: '5' });
            }
            const result = kind === 'single' ? await actions.createPowerOutageRequest(input) : await actions.createMultiplePowerOutageRequests([input], KEY);
            assert.equal(result.success, false);
            assert.equal(state.writeAttempts, 0);
            assert.equal(state.rows.size, 0);
        });
    }
    for (const role of ['USER', 'ADMIN'])
        test(`actual ${kind} Action allows ${role} in valid scope`, async () => {
            const { state, actions } = outageHarness();
            state.actor.role = role;
            const input = role === 'ADMIN' ? row({ workCenterId: '3', branchId: '6' }) : row();
            const result = kind === 'single' ? await actions.createPowerOutageRequest(input) : await actions.createMultiplePowerOutageRequests([input], KEY);
            assert.equal(result.success, true);
            assert.equal(state.rows.size, 1);
            assert.equal(state.calendarCalls, 1);
        });
}
test('bulk Action rejects mixed scopes, missing transformers and invalid dates atomically', async () => {
    for (const bad of [row({ branchId: '6' }), row({ transformerNumber: 'missing' }), row({ outageDate: '2026-02-30' })]) {
        const { state, actions } = outageHarness();
        const result = await actions.createMultiplePowerOutageRequests([row(), bad], KEY);
        assert.equal(result.success, false);
        assert.equal(result.successCount, 0);
        assert.equal(state.writeAttempts, 0);
    }
});
test('bulk uses one exact transformer query, distinct branch pairs and one calendar call per distinct date', async () => {
    const { state, actions } = outageHarness();
    state.actor.role = 'ADMIN';
    const result = await actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' }), row({ workCenterId: '3', branchId: '6', outageDate: '2026-12-02' })], KEY);
    assert.equal(result.success, true);
    assert.equal(state.branchCalls, 1);
    assert.equal(state.transformerCalls, 1);
    assert.equal(state.calendarCalls, 2);
});
test('actual date preview and new-save Action obey the same authoritative calendar decision', async () => {
    for (const valid of [true, false]) {
        const { state, actions } = outageHarness();
        state.calendarValid = valid;
        const preview = await actions.validateOutageDatesForImport(['2026-12-01', '2026-12-01']);
        assert.equal(preview.results['2026-12-01'].isValid, valid);
        assert.equal(state.calendarCalls, 1);
        const saved = await actions.createMultiplePowerOutageRequests([row()], KEY);
        assert.equal(saved.success, valid);
        if (!valid)
            assert.equal(state.writeAttempts, 0);
    }
});
test('Action date/time domain boundaries reject impossible dates, 29 minutes and out-of-hours', async () => {
    const rejects = [{ outageDate: '2026-02-29' }, { outageDate: '2026-10-01junk' }, { startTime: '08:00junk' }, { endTime: '08:29' }, { startTime: '05:59' }, { startTime: '19:31', endTime: '20:00' }, { endTime: '20:01' }];
    for (const bad of rejects) {
        const { state, actions } = outageHarness();
        assert.equal((await actions.createPowerOutageRequest(row(bad))).success, false);
        assert.equal(state.writeAttempts, 0);
    }
    for (const times of [{ startTime: '06:00', endTime: '06:30' }, { startTime: '19:30', endTime: '20:00' }]) {
        const { actions } = outageHarness();
        assert.equal((await actions.createPowerOutageRequest(row(times))).success, true);
    }
});
function transformerHarness({ commitFailure = false, results = [{ created_count: 1n, updated_count: 0n }], failBatch = 0 } = {}) {
    const state = { session: true, role: 'ADMIN', transactionCalls: 0, queryCalls: 0, committed: 0, progress: [], batches: [] };
    const prisma = {
        async $transaction(work) { state.transactionCalls++; const result = await work({ async $queryRawUnsafe(sql, numbers, gis) { state.queryCalls++; state.batches.push({ numbers, gis }); if (failBatch === state.transactionCalls)
                throw new Error('batch failed'); return typeof results === 'function' ? results(numbers) : results; } }); if (commitFailure)
            throw new Error('commit failed'); state.committed++; return result; },
    };
    const load = createTypescriptLoader(root, { '../../../lib/prisma': prisma, '@/lib/server/auth/currentActor': { async getCurrentActor() { if (!state.session) throw new Error('anonymous'); return { id: 1, role: state.role, workCenterId: 2, branchId: 5 }; }, async requireAdmin() { if (!state.session || state.role !== 'ADMIN') throw new Error('forbidden'); return { id: 1, role: state.role, workCenterId: 2, branchId: 5 }; } }, 'next-auth/next': { async getServerSession() { return state.session ? { user: { role: state.role } } : null; } }, '@/authOption': { authOptions: {} } });
    return { state, actions: load('app/api/action/User.ts') };
}
test('transformer Action rejects anonymous and non-admin requests before writes', async () => {
    for (const role of [null, 'USER', 'VIEWER']) {
        const { state, actions } = transformerHarness();
        if (!role)
            state.session = false;
        else
            state.role = role;
        const result = await actions.bulkUpsertTransformers([{ transformerNumber: 'TR1', gisDetails: 'GIS' }]);
        assert.equal(result.success, false);
        assert.equal(state.transactionCalls, 0);
    }
});
test('transformer callback success followed by commit failure credits no persistence or progress', async () => {
    const { state, actions } = transformerHarness({ commitFailure: true });
    const result = await actions.bulkUpsertTransformers([{ transformerNumber: 'TR1', gisDetails: 'GIS' }], (progress) => state.progress.push(progress.processedRecords));
    assert.equal(result.success, false);
    assert.equal(result.results.success, 0);
    assert.equal(result.results.created, 0);
    assert.equal(result.results.updated, 0);
    assert.equal(state.committed, 0);
    assert.ok(state.progress.every((count) => count === 0));
});
test('transformer missing/malformed RETURNING counts fail inside transaction', async () => {
    for (const results of [undefined, [], [{ created_count: null, updated_count: 0 }], [{ created_count: NaN, updated_count: 0 }], [{ created_count: -1, updated_count: 2 }], [{ created_count: 0, updated_count: 0 }], [{ created_count: 1.5, updated_count: 0 }], [{ created_count: '1', updated_count: 0 }]]) {
        // Explicit undefined is preserved rather than the harness default.
        const { state, actions } = transformerHarness({ results: () => results });
        const result = await actions.bulkUpsertTransformers([{ transformerNumber: 'TR1', gisDetails: 'GIS' }]);
        assert.equal(result.success, false);
        assert.equal(result.results.success, 0);
        assert.equal(state.committed, 0);
    }
});
test('transformer later-batch rollback reports only earlier committed rows and physical action rows', async () => {
    const { state, actions } = transformerHarness({ results: (numbers) => [{ created_count: BigInt(numbers.length), updated_count: 0n }], failBatch: 2 });
    const rows = Array.from({ length: 251 }, (_, i) => ({ transformerNumber: `TR${i}`, gisDetails: 'GIS' }));
    const result = await actions.bulkUpsertTransformers(rows, (p) => state.progress.push(p.processedRecords));
    assert.equal(result.success, false);
    assert.equal(result.results.success, 250);
    assert.equal(result.results.created, 250);
    assert.equal(state.committed, 1);
    assert.equal(result.results.errors[0].row, 251);
    assert.equal(state.progress.at(-1), 250);
});
test('client upload deduplicates entire file before chunks, first trimmed case-sensitive number wins', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ transformerNumber: `TR${i}`, gisDetails: `first${i}`, physicalRow: i + 2 }));
    rows.push({ transformerNumber: ' TR0 ', gisDetails: 'last must not win', physicalRow: 900 }, { transformerNumber: 'tr0', gisDetails: 'case distinct', physicalRow: 901 });
    const chunks = [];
    const summary = await uploadTransformerRows(rows, async (chunk) => { chunks.push(chunk); return { success: true, results: { success: chunk.length, created: chunk.length, updated: 0, errors: [] } }; });
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0][0].gisDetails, 'first0');
    assert.equal(chunks[1][0].transformerNumber, 'tr0');
    assert.equal(summary.saved, 251);
    assert.deepEqual(summary.duplicates, [{ transformerNumber: 'TR0', physicalRow: 900, firstPhysicalRow: 2 }]);
});
test('client upload preserves partial counts and original physical source rows after later failure', async () => {
    const rows = Array.from({ length: 251 }, (_, i) => ({ transformerNumber: `TR${i}`, gisDetails: 'GIS', physicalRow: i === 250 ? 777 : i + 2 }));
    let calls = 0;
    const summary = await uploadTransformerRows(rows, async (chunk) => ++calls === 1 ? { success: true, results: { success: 250, created: 200, updated: 50, errors: [] } } : { success: false, results: { success: 0, created: 0, updated: 0, errors: [{ row: 1, error: 'rolled back' }] } });
    assert.equal(summary.saved, 250);
    assert.equal(summary.created, 200);
    assert.equal(summary.updated, 50);
    assert.match(summary.errors[0], /777.*rolled back/);
    calls = 0;
    const transport = await uploadTransformerRows(rows, async () => { if (++calls === 2)
        throw new Error('network unavailable'); return { success: true, results: { success: 250, created: 250, updated: 0, errors: [] } }; });
    assert.equal(transport.saved, 250);
    assert.match(transport.errors[0], /777.*network unavailable/);
});
test('business-calendar service handles holidays/special workdays with host-zone-independent days', async () => {
    const NativeDate = Date;
    class FixedDate extends NativeDate {
        constructor(...args) { super(...(args.length ? args : ['2026-10-01T13:00:00Z'])); }
        static now() { return Date.parse('2026-10-01T13:00:00Z'); }
    }
    let entries = [];
    const prisma = { businessCalendarDate: { async findMany({ where }) { return entries.filter((entry) => entry.date >= where.date.gte && entry.date <= where.date.lte); } } };
    const load = createTypescriptLoader(root, { '@/lib/prisma': prisma, 'global:Date': FixedDate });
    const { BusinessCalendarService } = load('lib/services/businessCalendar.service.ts');
    const target = new NativeDate('2026-10-12T00:00:00Z');
    assert.equal((await BusinessCalendarService.validateOutageDate(target)).isValid, true);
    entries = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((key, i) => ({ id: i + 1, date: new NativeDate(key), type: 'HOLIDAY', name: key, scope: 'GLOBAL', note: null, isActive: true }));
    const rejected = await BusinessCalendarService.validateOutageDate(target);
    assert.equal(rejected.isValid, false);
    assert.equal(rejected.businessDaysUntilOutage, 2);
    entries = ['2026-10-05', '2026-10-06'].map((key, i) => ({ id: i + 1, date: new NativeDate(key), type: 'HOLIDAY', name: key, scope: 'GLOBAL', note: null, isActive: true }));
    assert.equal((await BusinessCalendarService.validateOutageDate(target)).businessDaysUntilOutage, 5);
    entries.push({ id: 3, date: new NativeDate('2026-10-10'), type: 'SPECIAL_WORKDAY', name: 'Saturday', scope: 'GLOBAL', note: null, isActive: true });
    const allowed = await BusinessCalendarService.validateOutageDate(target);
    assert.equal(allowed.isValid, true);
    assert.equal(allowed.businessDaysUntilOutage, 6);
    assert.equal(allowed.calendarDaysUntilOutage, 11);
    // Counting across the US DST transition still advances Thai calendar days.
    assert.equal(await BusinessCalendarService.countBusinessDaysBetween('2026-10-30', '2026-11-03'), 2);
});
test('actual Excel importer preserves blank physical rows and supports 1900/1904 serial systems', async () => {
    const XLSX = (await import('xlsx')).default;
    for (const date1904 of [false, true]) {
        const stateValues = [], setters = [];
        let slot = 0;
        const react = { useState(initial) { const index = slot++; stateValues[index] = initial; const setter = (value) => { stateValues[index] = typeof value === 'function' ? value(stateValues[index]) : value; }; setters.push(setter); return [initial, setter]; }, useRef(initial) { return { current: initial }; } };
        const calls = { dates: [], numbers: [], imported: [] };
        const actionPorts = { async validateOutageDatesForImport(dates) { calls.dates.push(dates); return { success: true, results: Object.fromEntries(dates.map((date) => [date, { isValid: true }])) }; }, async getTransformersByNumbers(numbers) { calls.numbers.push(numbers); return numbers.map((number) => ({ transformerNumber: number, gisDetails: 'GIS' })); } };
        const load = createTypescriptLoader(root, { 'react': react, '@/components/forms': { FormButton: () => null }, '@/lib/api/client': actionPorts });
        const { CSVImport } = load('app/power-outage-requests/create/components/csv-import/CSVImport.tsx');
        const view = CSVImport({ role: 'USER', userWorkCenterId: '2', userBranch: '5', onImportData(data) { calls.imported.push(data); } });
        function findInput(node) { if (!node || typeof node !== 'object')
            return null; if (node.props?.type === 'file')
            return node; for (const child of [node.props?.children].flat(Infinity)) {
            const found = findInput(child);
            if (found)
                return found;
        } return null; }
        const input = findInput(view);
        assert.ok(input);
        const serial1900 = (Date.UTC(2026, 11, 1) - Date.UTC(1899, 11, 30)) / 86400000;
        const serial = serial1900 - (date1904 ? 1462 : 0);
        const data = [['วันที่ดับไฟ', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'หมายเลขหม้อแปลง', 'สถานที่ติดตั้ง (GIS)', 'พื้นที่ไฟดับ'], [], [serial, 'bad', '08:30', 'TR1', 'GIS', ''], [serial, '08:00', '08:30', 'TR2', 'GIS', '']];
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(data), 'Import');
        book.Workbook = { WBProps: { date1904 } };
        const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
        await input.props.onChange({ target: { files: [{ name: 'source.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytes; } }] } });
        const errors = stateValues[2], summary = stateValues[3];
        assert.ok(errors.some((error) => error.row === 3 && error.field === 'เวลาเริ่มต้น'));
        assert.equal(summary.total, 2);
        assert.equal(summary.success, 1);
        assert.equal(summary.errors, 1);
        assert.equal(calls.imported[0][0].outageDate, '2026-12-01');
        assert.deepEqual(calls.numbers, [['TR1', 'TR2']]);
    }
});
test('bulk Action cap boundaries and byte ceiling fail before writes', async () => {
    const { state, actions } = outageHarness();
    const allowed = await actions.createMultiplePowerOutageRequests(Array.from({ length: 500 }, () => row()), KEY);
    assert.equal(allowed.success, true);
    assert.equal(state.rows.size, 500);
    const over = outageHarness();
    assert.equal((await over.actions.createMultiplePowerOutageRequests(Array.from({ length: 501 }, () => row()), KEY)).success, false);
    assert.equal(over.state.writeAttempts, 0);
    const bytes = outageHarness();
    assert.equal((await bytes.actions.createMultiplePowerOutageRequests([row({ gisDetails: 'ก'.repeat(850000) })], KEY)).success, false);
    assert.equal(bytes.state.writeAttempts, 0);
    assert.equal((await actions.validateOutageDatesForImport(Array.from({ length: 501 }, () => '2026-12-01'))).success, false);
});
test('transformer Action enforces 1000-row maximum, updating repeats without duplicate rows', async () => {
    const { state, actions } = transformerHarness({ results: (numbers) => [{ created_count: 0n, updated_count: BigInt(numbers.length) }] });
    const rows = Array.from({ length: 1000 }, (_, i) => ({ transformerNumber: `TR${i}`, gisDetails: 'GIS' }));
    const result = await actions.bulkUpsertTransformers(rows);
    assert.equal(result.success, true);
    assert.equal(result.results.created, 0);
    assert.equal(result.results.updated, 1000);
    assert.equal(state.committed, 4);
    const denied = await actions.bulkUpsertTransformers([...rows, { transformerNumber: 'extra', gisDetails: 'GIS' }]);
    assert.equal(denied.success, false);
    assert.equal(state.committed, 4);
});
function calendarHarness() {
    const state = { session: true, role: 'ADMIN', writes: 0, rows: new Map() };
    const key = ({ date, scope }) => `${date.toISOString()}:${scope}`;
    const prisma = { businessCalendarDate: { async findUnique({ where }) { return state.rows.get(key(where.date_scope)) || null; }, async upsert({ where, create }) { if (create.name === 'force failure')
                throw new Error('DB failed'); const identity = key(where.date_scope); state.writes++; const row = { ...create, id: state.rows.size + 1, createdAt: new Date(), updatedAt: new Date() }; state.rows.set(identity, row); return row; } } };
    const load = createTypescriptLoader(root, { '@/lib/prisma': prisma, '@/authOption': { authOptions: {} }, '@/lib/server/auth/currentActor': { async getCurrentActor() { if (!state.session) throw new Error('anonymous'); return { id: 1, role: state.role, workCenterId: 2, branchId: 5 }; }, async requireAdmin() { if (!state.session || state.role !== 'ADMIN') throw new Error('forbidden'); return { id: 1, role: state.role, workCenterId: 2, branchId: 5 }; } }, 'next-auth/next': { async getServerSession() { return state.session ? { user: { role: state.role } } : null; } } });
    return { state, actions: load('app/api/action/businessCalendar.ts') };
}
test('calendar Action caps at500, rejects unauthenticated/non-admin writes, and reports per-row partial persistence', async () => {
    const base = { date: '2026-12-01', type: 'HOLIDAY', name: 'Holiday', scope: 'GLOBAL' };
    for (const role of [null, 'USER', 'VIEWER']) {
        const { state, actions } = calendarHarness();
        if (role === null)
            state.session = false;
        else
            state.role = role;
        assert.equal((await actions.bulkImportBusinessCalendarDates([base])).success, false);
        assert.equal(state.writes, 0);
    }
    const { state, actions } = calendarHarness();
    assert.equal((await actions.bulkImportBusinessCalendarDates(Array.from({ length: 501 }, () => base))).success, false);
    assert.equal(state.writes, 0);
    const capped = await actions.bulkImportBusinessCalendarDates(Array.from({ length: 500 }, () => base));
    assert.equal(capped.success, true);
    assert.equal(capped.results.created, 1);
    assert.equal(capped.results.updated, 499);
    assert.equal(state.rows.size, 1);
    const partial = await actions.bulkImportBusinessCalendarDates([{ ...base, name: 'updated', rowNumber: 9 }, { ...base, date: '2026-02-30', rowNumber: 17 }, { ...base, date: '2026-12-02', name: 'force failure', rowNumber: 33 }, { ...base, scope: 'LOCAL', rowNumber: 51 }]);
    assert.equal(partial.success, false);
    assert.equal(partial.results.created, 1);
    assert.equal(partial.results.updated, 1);
    assert.equal(partial.results.errors.length, 2);
    assert.match(partial.results.errors[0], /17/);
    assert.match(partial.results.errors[1], /33/);
    assert.equal(state.rows.size, 2);
});
test('transformer repeated import updates the same case-sensitive identities in the mocked database', async () => {
    const stored = new Map();
    const { actions } = transformerHarness({ results: (numbers) => { let created = 0, updated = 0; for (const number of numbers) {
            if (stored.has(number))
                updated++;
            else
                created++;
            stored.set(number, true);
        } return [{ created_count: BigInt(created), updated_count: BigInt(updated) }]; } });
    const rows = [{ transformerNumber: 'TR1', gisDetails: 'first' }, { transformerNumber: ' TR1 ', gisDetails: 'discarded' }, { transformerNumber: 'tr1', gisDetails: 'case distinct' }];
    const first = await actions.bulkUpsertTransformers(rows);
    assert.equal(first.results.created, 2);
    assert.equal(first.results.duplicatesRemoved, 1);
    assert.equal(stored.size, 2);
    const repeat = await actions.bulkUpsertTransformers([rows[0], rows[2]]);
    assert.equal(repeat.success, true);
    assert.equal(repeat.results.created, 0);
    assert.equal(repeat.results.updated, 2);
    assert.equal(stored.size, 2);
});

test('actual CSV importer rejects header-only input without staging data', async () => {
  const values = []; let index = 0, imported = 0;
  const react = { useState(initial) { const slot = index++; values[slot] = initial; return [initial, (value) => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }]; }, useRef(initial) { return { current: initial }; } };
  const load = createTypescriptLoader(root, { react, '@/components/forms': { FormButton: () => null }, '@/lib/api/client': { async validateOutageDatesForImport() { throw new Error('must reject before server validation'); }, async getTransformersByNumbers() { return []; }, async getBranches() { return []; } } });
  const { CSVImport } = load('app/power-outage-requests/create/components/csv-import/CSVImport.tsx');
  const view = CSVImport({ role: 'USER', onImportData() { imported++; } });
  function findInput(node) { if (!node || typeof node !== 'object') return null; if (node.props?.type === 'file') return node; for (const child of [node.props?.children].flat(Infinity)) { const found = findInput(child); if (found) return found; } return null; }
  const bytes = new TextEncoder().encode('วันที่ดับไฟ,เวลาเริ่มต้น,เวลาสิ้นสุด,หมายเลขหม้อแปลง,สถานที่ติดตั้ง (GIS),พื้นที่ไฟดับ\n\n');
  await findInput(view).props.onChange({ target: { files: [{ name: 'empty.csv', size: bytes.length, async arrayBuffer() { return bytes.buffer; } }] } });
  assert.equal(imported, 0); assert.equal(values[2][0].row, 0); assert.match(values[2][0].message, /header/); assert.equal(values[3], null);
});
