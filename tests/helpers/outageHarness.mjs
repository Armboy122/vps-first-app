import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './loadTypescript.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function outageHarness() {
    const state = { actor: { id: 1, employeeId: 'E1', role: 'USER', workCenterId: 2, branchId: 5 }, session: true, batches: new Map(), rows: new Map(), nextId: 1, writeAttempts: 0, commits: 0, branchCalls: 0, transformerCalls: 0, calendarCalls: 0, calendarValid: true, transformers: new Set(['TR1', 'TR2']), failure: null, reverseRows: false };
    const branchRows = [{ id: 5, workCenterId: 2 }, { id: 6, workCenterId: 3 }];
    const filterBranches = (where) => branchRows.filter((branch) => (where.OR || [where]).some((pair) => pair.id === branch.id && pair.workCenterId === branch.workCenterId));
    let queue = Promise.resolve();
    const prisma = {
        branch: {
            async findFirst({ where }) { state.branchCalls++; return filterBranches(where)[0] || null; },
            async findMany({ where }) { state.branchCalls++; return filterBranches(where); },
        },
        transformer: {
            async findUnique({ where }) { state.transformerCalls++; return state.transformers.has(where.transformerNumber) ? { transformerNumber: where.transformerNumber, gisDetails: 'GIS' } : null; },
            async findMany({ where }) { state.transformerCalls++; return [...state.transformers].filter((number) => where.transformerNumber.in.includes(number)).map((number) => ({ transformerNumber: number, gisDetails: 'GIS' })); },
        },
        outageRequestImport: { async findUnique({ where }) { return state.batches.get(where.idempotencyKey) || null; } },
        powerOutageRequest: {
            async findUnique({ where }) { return state.rows.get(where.id) || null; },
            async update({ where, data }) { state.writeAttempts++; const row = { ...state.rows.get(where.id), ...data }; state.rows.set(where.id, row); return row; },
            async delete({ where }) { state.writeAttempts++; const row = state.rows.get(where.id); state.rows.delete(where.id); return row; },
            async findMany({ where }) { return [...state.rows.values()].filter((row) => where.id.in.includes(row.id)); },
            async create({ data }) { state.writeAttempts++; const row = { ...data, id: state.nextId++ }; state.rows.set(row.id, row); state.commits++; return row; },
        },
        async $transaction(work) {
            const previous = queue;
            let release;
            queue = new Promise((resolve) => { release = resolve; });
            await previous;
            const batches = new Map(state.batches), rows = new Map(state.rows);
            let nextId = state.nextId;
            const tx = {
                outageRequestImport: {
                    async create({ data }) {
                        state.writeAttempts++;
                        if (batches.has(data.idempotencyKey))
                            throw Object.assign(new Error('key collision'), { code: 'P2002', meta: { target: ['idempotencyKey'] } });
                        const record = { ...data, id: batches.size + 1, requestIds: [] };
                        batches.set(data.idempotencyKey, record);
                        return record;
                    },
                    async update({ where, data }) { if (state.failure === 'ledger')
                        throw new Error('ledger write failure'); const batch = [...batches.values()].find((batch) => batch.id === where.id); batches.set(batch.idempotencyKey, { ...batch, ...data }); },
                },
                powerOutageRequest: {
                    async createManyAndReturn({ data }) {
                        state.writeAttempts++;
                        if (state.failure === 'rows')
                            throw new Error('row write failure');
                        if (state.failure === 'unique-row')
                            throw Object.assign(new Error('unrelated unique row'), { code: 'P2002', meta: { target: ['otherField'] } });
                        const created = data.map((item) => ({ ...item, id: nextId++ }));
                        created.forEach((row) => rows.set(row.id, row));
                        if (state.failure === 'incomplete-return')
                            return created.slice(1);
                        return state.reverseRows ? created.reverse() : created;
                    },
                },
            };
            try {
                const result = await work(tx);
                if (state.failure === 'commit')
                    throw new Error('commit failure');
                state.batches = batches;
                state.rows = rows;
                state.nextId = nextId;
                state.commits++;
                return result;
            }
            finally {
                release();
            }
        },
    };
    class CalendarError extends Error {
    }
    const calendar = { async validateOutageDate() { state.calendarCalls++; return { isValid: state.calendarValid, error: state.calendarValid ? undefined : 'calendar changed' }; } };
    const services = { UserService: { async getUserByEmployeeId() { return state.actor; }, async getUserById() { return state.actor; } }, BusinessCalendarValidationError: CalendarError };
    const load = createTypescriptLoader(root, {
        '@/lib/prisma': prisma,
        '@/authOption': { authOptions: {} },
        '@/lib/cache-utils': { clearOMSCache() { } },
        'next-auth': { async getServerSession() { return state.session ? { user: { id: String(state.actor.id), employeeId: state.actor.employeeId } } : null; } },
        '@/lib/services': services,
        [path.join(root, 'lib/services/businessCalendar.service')]: { BusinessCalendarService: calendar, BusinessCalendarValidationError: CalendarError },
    });
    services.PowerOutageRequestService = load('lib/services/powerOutageRequest.service.ts').PowerOutageRequestService;
    const actions = load('app/api/action/powerOutageRequest.ts');
    return { state, prisma, actions, service: services.PowerOutageRequestService, load };
}
export const KEY = '12345678-1234-1234-1234-123456789abc';
export const row = (overrides = {}) => ({ outageDate: '2026-12-01', startTime: '08:00', endTime: '08:30', workCenterId: '2', branchId: '5', transformerNumber: 'TR1', gisDetails: 'GIS', area: null, ...overrides });
