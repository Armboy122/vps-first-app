import test from 'node:test';
import assert from 'node:assert/strict';
import { outageHarness, row, KEY } from './helpers/outageHarness.mjs';
test('bulk Action requires a well-formed idempotency key before persistence', async () => {
    for (const key of [undefined, '', 'x'.repeat(36), '-'.repeat(36), 'not-a-uuid']) {
        const { state, actions } = outageHarness();
        const result = await actions.createMultiplePowerOutageRequests([row()], key);
        assert.equal(result.success, false);
        assert.equal(state.writeAttempts, 0);
    }
});
test('exact retry returns identical IDs without writes and ignores changed creation calendar/transformers', async () => {
    const { state, actions } = outageHarness();
    state.reverseRows = true;
    const initial = await actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY);
    assert.equal(initial.success, true);
    assert.deepEqual(initial.data.map((item) => item.id), [1, 2]);
    const writes = state.writeAttempts, calendarCalls = state.calendarCalls, transformerCalls = state.transformerCalls;
    state.calendarValid = false;
    state.transformers.clear();
    const retry = await actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY);
    assert.equal(retry.success, true);
    assert.deepEqual(retry.data.map((item) => item.id), initial.data.map((item) => item.id));
    assert.equal(state.writeAttempts, writes);
    assert.equal(state.calendarCalls, calendarCalls);
    assert.equal(state.transformerCalls, transformerCalls);
});
test('same key with changed payload, order or actor is rejected', async () => {
    for (const change of ['payload', 'order', 'actor']) {
        const { state, actions } = outageHarness();
        const original = [row(), row({ transformerNumber: 'TR2' })];
        await actions.createMultiplePowerOutageRequests(original, KEY);
        const writes = state.writeAttempts;
        let input = original;
        if (change === 'payload')
            input = [row({ area: 'different' }), original[1]];
        if (change === 'order')
            input = [...original].reverse();
        if (change === 'actor')
            state.actor = { ...state.actor, id: 2, role: 'ADMIN', employeeId: 'E2' };
        const result = await actions.createMultiplePowerOutageRequests(input, KEY);
        assert.equal(result.success, false);
        assert.match(result.error, /different.*batch.*actor/);
        assert.equal(state.writeAttempts, writes);
    }
});
test('normalized equivalent fields bind to the same deterministic payload hash', async () => {
    const { state, actions } = outageHarness();
    const initial = await actions.createMultiplePowerOutageRequests([row({ area: '', gisDetails: ' GIS ', transformerNumber: ' TR1 ' })], KEY.toUpperCase());
    const writes = state.writeAttempts;
    const equivalent = { ...row(), branchId: '05', workCenterId: '02' };
    const retry = await actions.createMultiplePowerOutageRequests([equivalent], KEY);
    assert.equal(initial.success, true);
    assert.equal(retry.success, true);
    assert.deepEqual(retry.data.map((item) => item.id), initial.data.map((item) => item.id));
    assert.equal(state.writeAttempts, writes);
});
test('current role/scope authorization runs before existing retry resolution', async () => {
    for (const change of ['VIEWER', 'foreign']) {
        const { state, actions } = outageHarness();
        await actions.createMultiplePowerOutageRequests([row()], KEY);
        const writes = state.writeAttempts;
        if (change === 'VIEWER')
            state.actor.role = 'VIEWER';
        else
            state.actor.branchId = 6;
        const result = await actions.createMultiplePowerOutageRequests([row()], KEY);
        assert.equal(result.success, false);
        assert.equal(state.writeAttempts, writes);
    }
});
test('concurrent same-key requests converge on one committed batch', async () => {
    const { state, actions } = outageHarness();
    const [a, b] = await Promise.all([actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY), actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY)]);
    assert.equal(a.success, true);
    assert.equal(b.success, true);
    assert.deepEqual(a.data.map((item) => item.id), b.data.map((item) => item.id));
    assert.equal(state.batches.size, 1);
    assert.equal(state.rows.size, 2);
    assert.equal(state.commits, 1);
});
test('concurrent same-key different payload cannot receive winner data', async () => {
    const { state, actions } = outageHarness();
    const [a, b] = await Promise.all([actions.createMultiplePowerOutageRequests([row()], KEY), actions.createMultiplePowerOutageRequests([row({ area: 'changed' })], KEY)]);
    assert.equal(a.success, true);
    assert.equal(b.success, false);
    assert.match(b.error, /different/);
    assert.equal(state.rows.size, 1);
});
for (const failure of ['rows', 'ledger', 'commit', 'incomplete-return', 'unique-row'])
    test(`${failure} failure rolls back both outage rows and ledger`, async () => {
        const { state, actions } = outageHarness();
        state.failure = failure;
        const result = await actions.createMultiplePowerOutageRequests([row()], KEY);
        assert.equal(result.success, false);
        assert.equal(result.successCount, 0);
        assert.equal(state.rows.size, 0);
        assert.equal(state.batches.size, 0);
        assert.equal(state.commits, 0);
    });
test('missing replay rows and corrupt/empty ledger IDs fail integrity without recreation', async () => {
    for (const corrupt of ['missing', 'empty', 'duplicate', 'extra']) {
        const { state, actions } = outageHarness();
        await actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY);
        const writes = state.writeAttempts;
        const stored = state.batches.get(KEY);
        if (corrupt === 'missing')
            state.rows.delete(stored.requestIds[0]);
        else if (corrupt === 'empty')
            stored.requestIds = [];
        else if (corrupt === 'duplicate')
            stored.requestIds = [1, 1];
        else
            stored.requestIds = [1, 2, 3];
        const retry = await actions.createMultiplePowerOutageRequests([row(), row({ transformerNumber: 'TR2' })], KEY);
        assert.equal(retry.success, false);
        assert.match(retry.error, /incomplete|corrupt/);
        assert.equal(state.writeAttempts, writes);
    }
});
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

async function submitHookHarness(initialRequests = [row()]) {
    const { createTypescriptLoader } = await import('./helpers/loadTypescript.mjs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    let refIndex = 0;
    const refs = [];
    const react = {
        useCallback: (fn) => fn,
        useRef(initial) {
            const index = refIndex++;
            refs[index] ||= { current: initial };
            return refs[index];
        },
    };
    const state = {
        requests: initialRequests,
        submitStatus: null,
        errorModal: { opened: false },
        statusEvents: [],
        modalEvents: [],
        keys: [],
        payloads: [],
        resetCount: 0,
        storeResetCount: 0,
        backCount: 0,
        pushCount: 0,
        timers: [],
        outcome: { success: false, error: 'unknown save status', successCount: 0 },
    };
    const store = {
        setSubmitStatus(status) {
            state.submitStatus = status;
            state.statusEvents.push(status);
        },
        showErrorModal(modal) {
            state.errorModal = { ...state.errorModal, ...modal, opened: true };
            state.modalEvents.push(state.errorModal);
        },
        hideErrorModal() {
            state.errorModal = { ...state.errorModal, opened: false };
        },
    };
    const load = createTypescriptLoader(root, {
        react,
        '@/lib/api/client': {
            async createMultiplePowerOutageRequests(data, key) {
                state.keys.push(key);
                state.payloads.push(data);
                if (state.outcome instanceof Error) throw state.outcome;
                return await state.outcome;
            },
            async createPowerOutageRequest() { return { success: true }; },
        },
        '@/stores/powerOutageFormStore': { usePowerOutageFormStore: () => store },
        '@/lib/utils/logger': { logUserAction() {}, logFormInteraction() {}, logError() {} },
        'global:setTimeout': (callback, delay) => {
            state.timers.push({ callback, delay });
            return 0;
        },
    });
    const { usePowerOutageFormLogic } = load('app/power-outage-requests/create/hooks/usePowerOutageFormLogic.ts');
    function render() {
        refIndex = 0;
        return usePowerOutageFormLogic({
            form: { setValue() {}, reset() { state.resetCount++; } },
            minSelectableDate: '2026-10-12',
            setTimeError() {},
            addRequest() {},
            resetStore() {
                state.storeResetCount++;
                state.requests = [];
                state.submitStatus = null;
                state.errorModal = { opened: false };
            },
            router: { back() { state.backCount++; }, push() { state.pushCount++; } },
            requests: state.requests,
        });
    }
    return { state, render, dismiss: store.hideErrorModal, refs };
}

test('actual submit hook retains staged data/key on ambiguous failures and resets for changed payload/success', async () => {
    const { state, render, dismiss } = await submitHookHarness();
    const initialRequests = state.requests;
    state.outcome = new Error('network response lost');
    await render().handleSubmitAll();
    assert.equal(state.submitStatus.isLoading, false);
    assert.equal(state.submitStatus.success, false);
    assert.equal(state.errorModal.opened, true);
    assert.equal(state.errorModal.type, 'error');
    assert.match(state.errorModal.message, /เซิร์ฟเวอร์/);
    dismiss();
    assert.equal(state.errorModal.opened, false);
    assert.equal(state.submitStatus.isLoading, false);

    state.outcome = { success: false, error: 'unknown save status', successCount: 0 };
    await render().handleSubmitAll();
    assert.equal(state.keys[0], state.keys[1]);
    assert.equal(state.submitStatus.isLoading, false);
    assert.equal(state.resetCount, 0);
    assert.equal(state.storeResetCount, 0);
    assert.strictEqual(state.requests, initialRequests);
    assert.strictEqual(state.payloads[0], initialRequests);
    assert.strictEqual(state.payloads[1], initialRequests);
    assert.equal(state.errorModal.message, 'unknown save status');
    assert.equal(state.backCount, 0);
    assert.equal(state.timers.length, 0);
    dismiss();

    state.requests = [row({ area: 'edited' })];
    await render().handleSubmitAll();
    assert.notEqual(state.keys[1], state.keys[2]);
    assert.equal(state.submitStatus.isLoading, false);
    dismiss();

    state.outcome = { success: true, successCount: state.requests.length, message: 'saved' };
    await render().handleSubmitAll();
    assert.equal(state.keys[2], state.keys[3]);
    assert.equal(state.resetCount, 1);
    assert.equal(state.storeResetCount, 1);
    assert.deepEqual(state.requests, []);
    assert.deepEqual(state.submitStatus, { success: true, message: 'saved' });
    assert.equal(state.errorModal.opened, false);
    assert.equal(state.timers.length, 1);
    assert.equal(state.timers[0].delay, 1500);
    assert.equal(state.backCount, 0);
    state.timers[0].callback();
    assert.equal(state.backCount, 1);
    assert.equal(state.pushCount, 0);
    assert.deepEqual(state.statusEvents.at(-1), { success: true, message: 'saved' });

    state.requests = [row({ area: 'edited' })];
    await render().handleSubmitAll();
    assert.notEqual(state.keys[3], state.keys[4]);
});

test('actual submit hook stays loading while pending then releases returned failures with validation details intact', async () => {
    const { state, render, dismiss, refs } = await submitHookHarness();
    const pending = deferred();
    const originalRequests = state.requests;
    const validationErrors = [{ index: 0, error: 'invalid transformer', data: row() }];
    state.outcome = pending.promise;
    const completion = render().handleSubmitAll();
    assert.equal(state.submitStatus.isLoading, true);
    assert.equal(state.errorModal.opened, false);
    assert.strictEqual(state.requests, originalRequests);
    assert.equal(state.resetCount, 0);
    const attempt = { ...refs[0].current };
    pending.resolve({ success: false, error: 'validation failed', validationErrors });
    await completion;
    assert.deepEqual(state.submitStatus, { success: false, message: 'validation failed', isLoading: false });
    assert.equal(state.errorModal.opened, true);
    assert.strictEqual(state.errorModal.validationErrors, validationErrors);
    assert.equal(state.errorModal.showDetails, true);
    assert.deepEqual(refs[0].current, attempt);
    assert.strictEqual(state.requests, originalRequests);
    assert.equal(state.storeResetCount, 0);
    dismiss();
    state.outcome = { success: false, error: 'retry failed' };
    await render().handleSubmitAll();
    assert.equal(state.keys[1], state.keys[0]);
    assert.strictEqual(state.payloads[1], originalRequests);
    assert.equal(state.submitStatus.isLoading, false);
});

test('actual submit hook releases rejected pending saves without discarding queue/fingerprint/retry key', async () => {
    const { state, render, dismiss, refs } = await submitHookHarness();
    const pending = deferred();
    const originalRequests = state.requests;
    state.outcome = pending.promise;
    const completion = render().handleSubmitAll();
    assert.equal(state.submitStatus.isLoading, true);
    const attempt = { ...refs[0].current };
    pending.reject(new Error('lost response'));
    await completion;
    assert.equal(state.submitStatus.isLoading, false);
    assert.equal(state.submitStatus.success, false);
    assert.equal(state.errorModal.opened, true);
    assert.deepEqual(refs[0].current, attempt);
    assert.strictEqual(state.requests, originalRequests);
    assert.equal(state.resetCount, 0);
    assert.equal(state.storeResetCount, 0);
    assert.equal(state.timers.length, 0);
    dismiss();
    state.outcome = { success: true, successCount: 1, message: 'retry saved' };
    await render().handleSubmitAll();
    assert.equal(state.keys[1], state.keys[0]);
    assert.strictEqual(state.payloads[1], originalRequests);
    assert.equal(state.resetCount, 1);
    assert.equal(state.storeResetCount, 1);
    assert.equal(state.submitStatus.message, 'retry saved');
    assert.notEqual(state.submitStatus.isLoading, true);
});

test('actual submit hook uses the existing fallback failure message and modal detail visibility', async () => {
    const { state, render } = await submitHookHarness();
    state.outcome = { success: false };
    await render().handleSubmitAll();
    assert.equal(state.submitStatus.isLoading, false);
    assert.equal(state.submitStatus.message, state.errorModal.message);
    assert.match(state.errorModal.message, /หลายรายการ/);
    assert.deepEqual(state.errorModal.validationErrors, []);
    assert.equal(state.errorModal.showDetails, false);
});

test('actual submit hook warns on an empty queue without calling the save action or creating an attempt', async () => {
    const { state, render, refs } = await submitHookHarness([]);
    await render().handleSubmitAll();
    assert.deepEqual(state.keys, []);
    assert.deepEqual(state.payloads, []);
    assert.deepEqual(state.statusEvents, []);
    assert.equal(state.resetCount, 0);
    assert.equal(state.storeResetCount, 0);
    assert.equal(state.timers.length, 0);
    assert.equal(refs[0].current, null);
    assert.equal(state.errorModal.opened, true);
    assert.equal(state.errorModal.type, 'warning');
});

test('unrelated uniqueness failure cannot be swallowed even if an exact ledger appears concurrently', async () => {
  const { runIdempotentBatch } = await import('../lib/services/idempotentBatch.ts');
  let lookups = 0;
  const unrelated = Object.assign(new Error('another unique constraint'), { code: 'P2002', meta: { target: ['otherField'] } });
  const store = {
    async findBatch() { return ++lookups === 1 ? null : { payloadHash: 'hash', createdById: 1, requestIds: [1] }; },
    async loadItems() { return [{ id: 1 }]; },
    async transaction(work) { return work({ async createBatch() { return { id: 1 }; }, async createItems() { throw unrelated; }, async updateBatchRequestIds() {} }); },
  };
  await assert.rejects(runIdempotentBatch({ idempotencyKey: KEY, payloadHash: 'hash', createdById: 1 }, [{}], store, async () => {}), (error) => error === unrelated);
  assert.equal(lookups, 1);
});
