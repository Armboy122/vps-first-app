import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';
import { parseCsvDocument } from '../lib/utils/csvDocument.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atMidnight = (key) => new Date(`${key}T00:00:00.000Z`);
const request = (id, date, workCenterId = 2) => ({
    id,
    outageDate: atMidnight(date),
    startTime: new Date(`${date}T01:00:00.000Z`),
    endTime: new Date(`${date}T01:30:00.000Z`),
    transformerNumber: `TR${id}`,
    gisDetails: `GIS "${id}", เขต\r\nข้อมูลเพิ่มเติม`,
    workCenterId,
    workCenter: { id: workCenterId, name: workCenterId === 2 ? 'จุดรวมงานสอง' : 'จุดรวมงานสาม' },
    branch: { shortName: 'สาขา' },
    createdBy: { fullName: 'ผู้ยื่นคำขอ', employeeId: 'E1' },
    omsStatus: 'NOT_ADDED',
    statusRequest: 'PENDING',
    createdAt: new Date(`${date}T02:00:00.000Z`),
});
const defaultRows = [
    request(1, '2026-10-11'),
    request(2, '2026-10-12'),
    request(3, '2026-10-13'),
    request(4, '2026-10-14'),
    request(5, '2026-10-12', 3),
];

/** Run the real component, Action and read service; replace only framework and read/download ports. */
function exportHarness(rows = defaultRows) {
    const state = { actionCalls: [], findManyCalls: [], countCalls: [], rows, readFailure: null, readGate: null };
    const matches = (row, where) =>
        (!where.workCenterId || row.workCenterId === where.workCenterId) &&
        (!where.outageDate?.gte || row.outageDate >= where.outageDate.gte) &&
        (!where.outageDate?.lte || row.outageDate <= where.outageDate.lte);
    const prisma = {
        powerOutageRequest: {
            async findMany(query) {
                state.findManyCalls.push(query);
                if (state.readGate) await state.readGate;
                if (state.readFailure) throw state.readFailure;
                return state.rows.filter((row) => matches(row, query.where)).slice(query.skip, query.skip + query.take);
            },
            async count(query) {
                state.countCalls.push(query);
                if (state.readGate) await state.readGate;
                if (state.readFailure) throw state.readFailure;
                return state.rows.filter((row) => matches(row, query.where)).length;
            },
        },
    };
    const services = { UserService: { async getUserById() { return { id: 1, employeeId: 'DEMO_ADMIN', fullName: 'Synthetic admin', role: 'ADMIN', workCenterId: 2, branchId: 5 }; } } };
    const backendLoad = createTypescriptLoader(root, {
        '@/lib/prisma': prisma,
        '@/lib/services': services,
        '@/lib/server/auth/currentActor': {
            AccessError: class AccessError extends Error {},
            async getCurrentActor() { return { id: 9, employeeId: 'E1', fullName: 'ผู้ทดสอบ', role: 'ADMIN', workCenterId: 2, branchId: 7 }; },
        },
        '@/authOption': { authOptions: {} },
        '@/lib/cache-utils': { clearOMSCache() {} },
        'next-auth': { async getServerSession() { return { user: { id: '1' } }; } },
        [path.join(root, 'lib/services/businessCalendar.service')]: { BusinessCalendarService: {}, BusinessCalendarValidationError: class extends Error {} },
    });
    services.PowerOutageRequestService = backendLoad('lib/services/powerOutageRequest.service.ts').PowerOutageRequestService;
    const actions = backendLoad('app/api/action/powerOutageRequest.ts');

    let stateIndex = 0;
    const values = [];
    const react = {
        useState(initial) {
            const index = stateIndex++;
            if (!(index in values)) values[index] = initial;
            return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
        },
        useEffect() {},
    };
    const jsx = (type, props, key) => ({ type, props: props || {}, key });
    const load = createTypescriptLoader(root, {
        react,
        'react/jsx-runtime': { jsx, jsxs: jsx },
        '@tanstack/react-query': { useQuery: () => ({ data: [{ id: 2, name: 'จุดรวมงานสอง' }, { id: 3, name: 'จุดรวมงานสาม' }] }) },
        '@/app/api/action/getWorkCentersAndBranches': { getWorkCenters() {} },
        '@/app/api/action/powerOutageRequest': {
            async getPowerOutageRequests(...args) {
                state.actionCalls.push(args);
                return actions.getPowerOutageRequests(...args);
            },
        },
        [path.join(root, 'app/admin/components/shared/LoadingSpinner')]: { LoadingSpinner: 'LoadingSpinner' },
        [path.join(root, 'app/admin/components/shared/FeedbackBanner')]: { FeedbackBanner: 'FeedbackBanner' },
        'lucide-react': { Download: 'Download' },
    });
    const { ExportDataComponent } = load('app/admin/components/export/ExportDataComponent.tsx');
    function render() {
        stateIndex = 0;
        return ExportDataComponent();
    }
    function descendants(node) {
        if (!node || typeof node !== 'object') return [];
        if (Array.isArray(node)) return node.flatMap(descendants);
        return [node, ...descendants(node.props?.children)];
    }
    const nodes = () => descendants(render());
    const button = () => nodes().find((node) => node.type === 'button' && Object.hasOwn(node.props, 'disabled'));
    function input(id, value) {
        const field = nodes().find((node) => node.props.id === id);
        assert.ok(field, `Expected actual export field ${id}`);
        field.props.onChange({ target: { value } });
    }
    return {
        state,
        render,
        input,
        button,
        submit: () => button().props.onClick(),
        feedback: (variant) => nodes().find((node) => node.type === 'FeedbackBanner' && node.props.variant === variant),
    };
}

async function withDownloadPorts(work) {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalCreateURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const downloads = { blobs: [], appended: [], clicked: [], removed: [] };
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            createElement(tag) {
                assert.equal(tag, 'a');
                const link = {
                    attributes: {},
                    style: {},
                    setAttribute(name, value) { this.attributes[name] = value; },
                    click() { downloads.clicked.push(this); },
                };
                return link;
            },
            body: {
                appendChild(link) { downloads.appended.push(link); },
                removeChild(link) { downloads.removed.push(link); },
            },
        },
    });
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value(blob) {
            downloads.blobs.push(blob);
            return `blob:export-workflow-${downloads.blobs.length}`;
        },
    });
    try {
        return await work(downloads);
    } finally {
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
        else delete globalThis.document;
        Object.defineProperty(URL, 'createObjectURL', originalCreateURL);
    }
}

const filterCases = [
    { name: 'no filter', inputs: {}, expected: {}, ids: [1, 2, 3, 4, 5] },
    { name: 'work center only', inputs: { workCenter: '2' }, expected: { workCenterId: 2 }, ids: [1, 2, 3, 4] },
    { name: 'start date only', inputs: { dateFrom: '2026-10-12' }, expected: { startDate: atMidnight('2026-10-12') }, ids: [2, 3, 4, 5] },
    { name: 'end date only', inputs: { dateTo: '2026-10-13' }, expected: { endDate: atMidnight('2026-10-13') }, ids: [1, 2, 3, 5] },
    { name: 'same day inclusive', inputs: { dateFrom: '2026-10-12', dateTo: '2026-10-12' }, expected: { startDate: atMidnight('2026-10-12'), endDate: atMidnight('2026-10-12') }, ids: [2, 5] },
    { name: 'multiple days inclusive', inputs: { dateFrom: '2026-10-12', dateTo: '2026-10-13' }, expected: { startDate: atMidnight('2026-10-12'), endDate: atMidnight('2026-10-13') }, ids: [2, 3, 5] },
    { name: 'date range combined with work center', inputs: { workCenter: '2', dateFrom: '2026-10-12', dateTo: '2026-10-13' }, expected: { workCenterId: 2, startDate: atMidnight('2026-10-12'), endDate: atMidnight('2026-10-13') }, ids: [2, 3] },
];

for (const scenario of filterCases) {
    test(`actual export component passes ${scenario.name} to real Action/service and downloads only included rows`, async () => {
        const harness = exportHarness();
        for (const [field, value] of Object.entries(scenario.inputs)) harness.input(field, value);
        await withDownloadPorts(async (downloads) => {
            await harness.submit();
            assert.equal(harness.state.actionCalls.length, 1);
            const [page, limit, filters] = harness.state.actionCalls[0];
            assert.equal(page, 1);
            assert.equal(limit, 10000);
            assert.deepEqual(filters, scenario.expected);
            assert.equal(Object.hasOwn(filters, 'dateFrom'), false);
            assert.equal(Object.hasOwn(filters, 'dateTo'), false);
            for (const date of [filters.startDate, filters.endDate].filter(Boolean)) {
                assert.ok(date instanceof Date);
                assert.match(date.toISOString(), /T00:00:00\.000Z$/);
            }
            const expectedWhere = {};
            if (scenario.expected.workCenterId) expectedWhere.workCenterId = scenario.expected.workCenterId;
            if (scenario.expected.startDate || scenario.expected.endDate) {
                expectedWhere.outageDate = {};
                if (scenario.expected.startDate) expectedWhere.outageDate.gte = scenario.expected.startDate;
                if (scenario.expected.endDate) expectedWhere.outageDate.lte = scenario.expected.endDate;
            }
            assert.equal(harness.state.findManyCalls.length, 1);
            assert.equal(harness.state.countCalls.length, 1);
            assert.deepEqual(harness.state.findManyCalls[0].where, expectedWhere);
            assert.deepEqual(harness.state.countCalls[0].where, expectedWhere);
            assert.strictEqual(harness.state.findManyCalls[0].where, harness.state.countCalls[0].where);
            assert.equal(harness.state.findManyCalls[0].skip, 0);
            assert.equal(harness.state.findManyCalls[0].take, 10000);
            assert.equal(downloads.blobs.length, 1);
            assert.equal(downloads.blobs[0].type, 'text/csv;charset=utf-8;');
            const bytes = Buffer.from(await downloads.blobs[0].arrayBuffer());
            assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
            const csvWithBom = bytes.toString('utf8');
            assert.equal(csvWithBom.split('\uFEFF').length - 1, 1, 'Actual download must contain exactly one BOM');
            const csv = csvWithBom.slice(1);
            assert.equal(csv.startsWith('\uFEFF'), false);
            assert.equal(csv.split('\n')[0].split(',')[0], 'วันที่ขอตัดไฟ');
            const parsed = parseCsvDocument(csv);
            const headers = parsed[0].values;
            assert.equal(headers[0], 'วันที่ขอตัดไฟ');
            const numberIndex = headers.indexOf('หมายเลขหม้อแปลง');
            const gisIndex = headers.indexOf('รายละเอียด GIS');
            assert.equal(headers.length, 11);
            assert.ok(numberIndex >= 0);
            assert.deepEqual(parsed.slice(1).map((record) => record.values[numberIndex]).sort(), scenario.ids.map((id) => `TR${id}`).sort());
            for (const record of parsed.slice(1)) {
                const id = Number(record.values[numberIndex].slice(2));
                assert.equal(record.values[gisIndex], request(id, '2026-10-12').gisDetails);
            }
            assert.equal(downloads.appended.length, 1);
            assert.deepEqual(downloads.appended, downloads.clicked);
            assert.deepEqual(downloads.clicked, downloads.removed);
            assert.equal(downloads.clicked[0].style.visibility, 'hidden');
            assert.equal(downloads.clicked[0].attributes.href, 'blob:export-workflow-1');
            assert.match(downloads.clicked[0].attributes.download, /^คำขอตัดไฟ_.+_\d{4}-\d{2}-\d{2}\.csv$/);
            if (scenario.inputs.workCenter) assert.ok(downloads.clicked[0].attributes.download.includes('จุดรวมงานสอง'));
            else assert.ok(downloads.clicked[0].attributes.download.includes('ทั้งหมด'));
            assert.equal(harness.button().props.disabled, false);
            assert.equal(harness.feedback('error'), undefined);
            assert.ok(harness.feedback('success').props.message.includes(`(${scenario.ids.length} รายการ)`));
        });
    });
}

const invalidCases = [
    { name: 'invalid start format', inputs: { dateFrom: '12/10/2026' } },
    { name: 'impossible start date', inputs: { dateFrom: '2026-02-30' } },
    { name: 'invalid end format', inputs: { dateTo: '2026-10-12T00:00:00.000Z' } },
    { name: 'impossible end date', inputs: { dateTo: '2026-13-12' } },
    { name: 'reversed date range', inputs: { dateFrom: '2026-10-13', dateTo: '2026-10-12' } },
];
for (const scenario of invalidCases) {
    test(`actual export component rejects ${scenario.name} before any Action/service read`, async () => {
        const harness = exportHarness();
        for (const [field, value] of Object.entries(scenario.inputs)) harness.input(field, value);
        await withDownloadPorts(async (downloads) => {
            await harness.submit();
            assert.deepEqual(harness.state.actionCalls, []);
            assert.deepEqual(harness.state.findManyCalls, []);
            assert.deepEqual(harness.state.countCalls, []);
            assert.deepEqual(downloads.blobs, []);
            assert.equal(harness.button().props.disabled, false);
            assert.ok(harness.feedback('error').props.message);
            assert.equal(harness.feedback('success'), undefined);
        });
    });
}

test('actual export component releases busy state on an empty filtered result and supports a corrected retry', async () => {
    const harness = exportHarness();
    harness.input('dateFrom', '2026-11-01');
    await withDownloadPorts(async (downloads) => {
        await harness.submit();
        assert.equal(harness.button().props.disabled, false);
        assert.equal(harness.feedback('error').props.message, 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก');
        assert.deepEqual(downloads.blobs, []);
        harness.input('dateFrom', '2026-10-12');
        await harness.submit();
        assert.equal(harness.state.actionCalls.length, 2);
        assert.equal(harness.button().props.disabled, false);
        assert.equal(harness.feedback('error'), undefined);
        assert.ok(harness.feedback('success'));
        assert.equal(downloads.blobs.length, 1);
    });
});

test('actual export component stays busy while service reads are pending, then releases rejection and allows retry', async () => {
    const harness = exportHarness();
    let release;
    harness.state.readGate = new Promise((resolve) => { release = resolve; });
    harness.state.readFailure = new Error('read connection failed');
    await withDownloadPorts(async (downloads) => {
        const completion = harness.submit();
        // The server action now resolves the authenticated actor before it
        // starts its repository reads; let that microtask reach the read gate.
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(harness.button().props.disabled, true);
        assert.equal(harness.state.actionCalls.length, 1);
        assert.equal(harness.state.findManyCalls.length, 1);
        assert.equal(harness.state.countCalls.length, 1);
        assert.deepEqual(downloads.blobs, []);
        release();
        await completion;
        assert.equal(harness.button().props.disabled, false);
        assert.equal(harness.feedback('error').props.message, 'Failed to fetch power outage requests');
        assert.equal(harness.feedback('success'), undefined);
        assert.deepEqual(downloads.blobs, []);
        harness.state.readGate = null;
        harness.state.readFailure = null;
        await harness.submit();
        assert.equal(harness.button().props.disabled, false);
        assert.equal(harness.feedback('error'), undefined);
        assert.ok(harness.feedback('success'));
        assert.equal(downloads.blobs.length, 1);
    });
});
