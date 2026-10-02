import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMultiplePowerOutageRequests,
  createPowerOutageRequest,
  deletePowerOutageRequest,
  getActiveBusinessCalendarDateMetadata,
  getBranches,
  getCurrentUser,
  getPowerOutageRequests,
  getTransformersByNumbers,
  getWorkCenters,
  searchTransformers,
  updateOMS,
  updatePowerOutageRequest,
  updateStatusRequest,
  validateOutageDatesForImport,
} from '../lib/api/client.ts';

const wireOutage = {
  id: 41,
  createdAt: '2026-10-01T02:03:04.000Z',
  createdById: 9,
  outageDate: '2026-10-20T00:00:00.000Z',
  startTime: '2026-10-20T01:00:00.000Z',
  endTime: '2026-10-20T01:30:00.000Z',
  workCenterId: 2,
  branchId: 7,
  transformerNumber: 'TR-41',
  gisDetails: 'GIS ทดสอบ',
  area: null,
  omsStatus: 'NOT_ADDED',
  statusRequest: 'NOT',
  statusUpdatedAt: null,
  statusUpdatedById: null,
  createdBy: { fullName: 'ผู้ใช้ทดสอบ' },
  workCenter: { id: 2, name: 'ศูนย์ทดสอบ' },
  branch: { shortName: 'สาขาทดสอบ' },
};

async function withFetch(implementation, work) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  try {
    await work();
  } finally {
    globalThis.fetch = original;
  }
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

test('outage list maps ISO date DTOs to Date values and carries list filters to Elysia', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/v1/outages?page=2&limit=25&workCenterId=2&startDate=2026-10-01&endDate=2026-10-31');
    assert.equal(init.method, 'GET');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store');
    return jsonResponse({
      success: true,
      data: [wireOutage],
      pagination: { page: 2, limit: 25, total: 51, totalPages: 3, hasNext: true, hasPrev: true },
    });
  }, async () => {
    const result = await getPowerOutageRequests(2, 25, {
      workCenterId: 2,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T00:00:00.000Z'),
    });
    assert.equal(result.data[0].outageDate instanceof Date, true);
    assert.equal(result.data[0].createdAt.toISOString(), wireOutage.createdAt);
    assert.equal(result.data[0].statusUpdatedAt, null);
    assert.deepEqual(result.pagination, { page: 2, limit: 25, total: 51, totalPages: 3, hasNext: true, hasPrev: true });
  });
});

test('branch lookup encodes a same-origin request and unwraps the standard data envelope', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/v1/branches?workCenterId=2');
    assert.equal(init.method, 'GET');
    return jsonResponse({ success: true, data: [{ id: 7, workCenterId: 2, shortName: 'ทดสอบ' }] });
  }, async () => {
    assert.deepEqual(await getBranches(2), [{ id: 7, workCenterId: 2, shortName: 'ทดสอบ' }]);
    assert.deepEqual(await getBranches(0), []);
  });
});

test('identity, work-center, transformer-search, exact lookup, and calendar reads use the frozen route shapes', async () => {
  const calls = [];
  const replies = [
    { success: true, data: { id: 9, employeeId: 'E9', fullName: 'ผู้ใช้', role: 'USER', workCenterId: 2, branchId: 7 } },
    { success: true, data: [{ id: 2, name: 'ศูนย์' }] },
    { success: true, data: [{ transformerNumber: 'TR-41', gisDetails: 'GIS ทดสอบ' }] },
    { success: true, data: [{ transformerNumber: 'TR-41', gisDetails: 'GIS ทดสอบ' }] },
    { success: true, data: [{ dateKey: '2026-10-12', type: 'HOLIDAY', name: 'วันหยุด', scope: 'GLOBAL' }] },
  ];
  await withFetch(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(replies.shift());
  }, async () => {
    assert.equal((await getCurrentUser()).employeeId, 'E9');
    assert.deepEqual(await getWorkCenters(), [{ id: 2, name: 'ศูนย์' }]);
    assert.deepEqual(await searchTransformers('TR & X'), [{ transformerNumber: 'TR-41', gisDetails: 'GIS ทดสอบ' }]);
    assert.deepEqual(await getTransformersByNumbers(['TR-41']), [{ transformerNumber: 'TR-41', gisDetails: 'GIS ทดสอบ' }]);
    assert.deepEqual(await getActiveBusinessCalendarDateMetadata('2026-01-01', '2027-12-31'), [{ dateKey: '2026-10-12', type: 'HOLIDAY', name: 'วันหยุด', scope: 'GLOBAL' }]);
  });
  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/me',
    '/api/v1/work-centers',
    '/api/v1/transformers?search=TR+%26+X',
    '/api/v1/transformers/lookup',
    '/api/v1/calendar?startDate=2026-01-01&endDate=2027-12-31',
  ]);
  assert.deepEqual(JSON.parse(calls[3].init.body), { numbers: ['TR-41'] });
});

test('preview date validation uses the existing success/results shape', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/v1/outages/import/preview-dates');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.headers['x-vps-client'], 'web');
    assert.deepEqual(JSON.parse(init.body), { dates: ['2026-10-20'] });
    return jsonResponse({ success: true, results: { '2026-10-20': { isValid: true } } });
  }, async () => {
    assert.deepEqual(await validateOutageDatesForImport(['2026-10-20']), {
      success: true,
      results: { '2026-10-20': { isValid: true } },
    });
  });
});

test('bulk import sends the exact caller idempotency key once and never retries a failed mutation', async () => {
  let calls = 0;
  const requests = [{ transformerNumber: 'TR-41', outageDate: '2026-10-20' }];
  const idempotencyKey = 'retry-key-kept-after-ambiguous-failure';
  await withFetch(async (url, init) => {
    calls += 1;
    assert.equal(url, '/api/v1/outages/import');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['x-vps-client'], 'web');
    assert.deepEqual(JSON.parse(init.body), { requests, idempotencyKey });
    throw new TypeError('connection lost after request send');
  }, async () => {
    await assert.rejects(createMultiplePowerOutageRequests(requests, idempotencyKey), /connection lost/);
    assert.equal(calls, 1);
  });
});

test('bulk import preserves server counts and normalizes response dates', async () => {
  await withFetch(async () => jsonResponse({
    success: true,
    data: [wireOutage],
    successCount: 1,
    totalCount: 1,
    message: 'saved',
  }), async () => {
    const result = await createMultiplePowerOutageRequests(
      [{ transformerNumber: 'TR-41', outageDate: '2026-10-20' }],
      'stable-key',
    );
    assert.equal(result.success, true);
    assert.equal(result.successCount, 1);
    assert.equal(result.totalCount, 1);
    assert.equal(result.data[0].outageDate instanceof Date, true);
  });
});

test('status mutation sends the exact DTO and preserves a structured conflict response', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/v1/outages/41/oms');
    assert.equal(init.method, 'PATCH');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.headers['x-vps-client'], 'web');
    assert.deepEqual(JSON.parse(init.body), { omsStatus: 'PROCESSED' });
    return jsonResponse({ success: false, error: 'สถานะเปลี่ยนแล้ว', code: 'CONFLICT' }, 409);
  }, async () => {
    assert.deepEqual(await updateOMS(41, 'PROCESSED'), {
      success: false,
      error: 'สถานะเปลี่ยนแล้ว',
      code: 'CONFLICT',
    });
  });
});

test('single create and edit use exact Elysia DTO bodies, and both responses hydrate dates', async () => {
  const input = {
    outageDate: '2026-10-20', startTime: '08:00', endTime: '08:30',
    workCenterId: '2', branchId: '7', transformerNumber: 'TR-41',
    gisDetails: 'GIS ทดสอบ', area: null,
  };
  let call = 0;
  await withFetch(async (url, init) => {
    call += 1;
    assert.equal(init.method, call === 1 ? 'POST' : 'PATCH');
    assert.equal(init.headers['x-vps-client'], 'web');
    if (call === 1) {
      assert.equal(url, '/api/v1/outages');
      assert.deepEqual(JSON.parse(init.body), input);
    } else {
      assert.equal(url, '/api/v1/outages/41');
      assert.deepEqual(JSON.parse(init.body), { outageDate: input.outageDate, startTime: input.startTime, endTime: input.endTime, area: null });
    }
    return jsonResponse({ success: true, data: wireOutage });
  }, async () => {
    const created = await createPowerOutageRequest(input);
    assert.equal(created.success, true);
    if (created.success) assert.equal(created.data.startTime instanceof Date, true);
    const updated = await updatePowerOutageRequest(41, input);
    assert.equal(updated.success, true);
    if (updated.success) assert.equal(updated.data.outageDate instanceof Date, true);
  });
  assert.equal(call, 2);
});

test('status updates and delete use the typed same-origin endpoints without inventing response data', async () => {
  const urls = [];
  await withFetch(async (url, init) => {
    urls.push(url);
    assert.equal(init.headers['x-vps-client'], 'web');
    if (init.method === 'PATCH') {
      assert.deepEqual(JSON.parse(init.body), { statusRequest: 'CONFIRM' });
      return jsonResponse({ success: true, data: wireOutage });
    }
    assert.equal(init.method, 'DELETE');
    return jsonResponse({ success: true, message: 'deleted' });
  }, async () => {
    const updated = await updateStatusRequest(41, 'CONFIRM');
    assert.equal(updated.success, true);
    const deleted = await deletePowerOutageRequest(41);
    assert.equal(deleted.success, true);
    if (deleted.success) assert.equal(deleted.message, 'deleted');
  });
  assert.deepEqual(urls, ['/api/v1/outages/41/status', '/api/v1/outages/41']);
});
