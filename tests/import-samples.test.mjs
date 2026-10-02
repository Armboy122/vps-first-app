import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';
import {
  PREVIEW_BRANCHES,
  PREVIEW_OUTAGE_REQUESTS,
  PREVIEW_TRANSFORMERS,
  PREVIEW_WORK_CENTERS,
} from '../prisma/fixtures/preview.ts';
import {
  buildImportSample,
  formatImportSampleRow,
  getImportSampleHeaders,
} from '../app/power-outage-requests/create/utils/importSample.ts';

const seededBranch = PREVIEW_BRANCHES.find((branch) => branch.isActorHome);
const center = { id: 101, name: PREVIEW_WORK_CENTERS[0].name };
const branch = { id: 202, shortName: seededBranch.shortName, workCenterId: center.id };
const transformers = PREVIEW_TRANSFORMERS.slice(0, 2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sampleApi(overrides = {}) {
  const calls = { calendar: [], dates: [], lookups: [], branches: [] };
  return {
    calls,
    api: {
      async getActiveBusinessCalendarDateMetadata(start, end) {
        calls.calendar.push([start, end]);
        return overrides.calendar ?? [];
      },
      async validateOutageDatesForImport(dates) {
        calls.dates.push(dates);
        return overrides.validation?.(dates) ?? {
          success: true,
          results: Object.fromEntries(dates.map((date) => [date, { isValid: true }])),
        };
      },
      async getTransformersByNumbers(numbers) {
        calls.lookups.push(numbers);
        return overrides.transformers ?? transformers;
      },
      async getBranches(workCenterId) {
        calls.branches.push(workCenterId);
        return overrides.branches ?? [branch];
      },
    },
  };
}

test('admin CSV/XLSX sample rows use seeded synthetic identity and the live calendar chooses valid future dates', async () => {
  const base = new Date('2026-10-01T12:00:00.000Z');
  const firstWeekday = '2026-10-15';
  const { api, calls } = sampleApi({
    calendar: [{ dateKey: firstWeekday, type: 'HOLIDAY', name: 'ทดสอบหยุด', scope: 'GLOBAL' }],
  });
  const sample = await buildImportSample({ role: 'ADMIN', workCenters: [center], now: base, api });

  assert.deepEqual(calls.lookups, [transformers.map((item) => item.transformerNumber)]);
  assert.deepEqual(calls.branches, [center.id]);
  assert.equal(calls.calendar.length, 1);
  assert.equal(calls.dates.length, 1);
  assert.equal(calls.dates[0].includes(firstWeekday), false, 'known calendar holiday is not offered');
  assert.equal(sample.requests.length, 2);
  assert.equal(sample.names.workCenterName, PREVIEW_WORK_CENTERS[0].name);
  assert.equal(sample.names.branchName, seededBranch.shortName);
  assert.deepEqual(sample.requests.map((item) => item.transformerNumber), transformers.map((item) => item.transformerNumber));
  assert.deepEqual(sample.requests.map((item) => item.gisDetails), transformers.map((item) => item.gisDetails));
  assert.deepEqual(sample.requests.map((item) => item.startTime), PREVIEW_OUTAGE_REQUESTS.slice(0, 2).map((item) => item.startTime));
  assert.deepEqual(sample.requests.map((item) => item.endTime), PREVIEW_OUTAGE_REQUESTS.slice(0, 2).map((item) => item.endTime));
  assert.deepEqual(sample.requests.map((item) => item.area), PREVIEW_OUTAGE_REQUESTS.slice(0, 2).map((item) => item.area));
  assert.ok(sample.requests.every((item) => item.workCenterId === String(center.id) && item.branchId === String(branch.id)));
  assert.ok(sample.requests.every((item) => item.outageDate !== firstWeekday));

  const headers = getImportSampleHeaders('ADMIN');
  assert.deepEqual(headers, ['วันที่ดับไฟ', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'จุดรวมงาน', 'สาขา', 'หมายเลขหม้อแปลง', 'สถานที่ติดตั้ง (GIS)', 'พื้นที่ไฟดับ']);
  assert.equal(formatImportSampleRow(sample.requests[0], 'ADMIN', sample.names)[3], PREVIEW_WORK_CENTERS[0].name);
  assert.equal(formatImportSampleRow(sample.requests[0], 'ADMIN', sample.names)[4], seededBranch.shortName);
});

test('regular-user sample omits administrator columns and verifies the assigned branch', async () => {
  const { api, calls } = sampleApi();
  const sample = await buildImportSample({
    role: 'USER',
    workCenters: [],
    userWorkCenterId: String(center.id),
    userBranch: String(branch.id),
    now: new Date('2026-10-01T12:00:00.000Z'),
    api,
  });
  assert.deepEqual(calls.branches, [center.id]);
  assert.deepEqual(getImportSampleHeaders('USER'), ['วันที่ดับไฟ', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'หมายเลขหม้อแปลง', 'สถานที่ติดตั้ง (GIS)', 'พื้นที่ไฟดับ']);
  assert.deepEqual(formatImportSampleRow(sample.requests[0], 'USER'), [
    sample.requests[0].outageDate,
    PREVIEW_OUTAGE_REQUESTS[0].startTime,
    PREVIEW_OUTAGE_REQUESTS[0].endTime,
    PREVIEW_TRANSFORMERS[0].transformerNumber,
    PREVIEW_TRANSFORMERS[0].gisDetails,
    PREVIEW_OUTAGE_REQUESTS[0].area,
  ]);
  assert.ok(sample.requests.every((item) => item.workCenterId === String(center.id) && item.branchId === String(branch.id)));
});

test('sample generation fails closed if seeded transformer identities are not available', async () => {
  const { api } = sampleApi({ transformers: [] });
  await assert.rejects(
    buildImportSample({ role: 'ADMIN', workCenters: [center], api }),
    /ข้อมูลหม้อแปลงตัวอย่าง/,
  );
});

test('sample generation rejects stale/missing API-calendar validation instead of shipping unverified dates', async () => {
  const { api } = sampleApi({
    validation: async (dates) => ({ success: true, results: Object.fromEntries(dates.map((date) => [date, { isValid: false, error: 'ไม่ผ่าน' }])) }),
  });
  await assert.rejects(
    buildImportSample({ role: 'ADMIN', workCenters: [center], api }),
    /ไม่พบวันที่ตัวอย่างที่ผ่านการตรวจสอบปฏิทิน/,
  );
});

test('generated sample rows re-import as valid ADMIN data using the exact seeded API lookups', async () => {
  const { api } = sampleApi();
  const sample = await buildImportSample({
    role: 'ADMIN',
    workCenters: [center],
    now: new Date('2026-10-01T12:00:00.000Z'),
    api,
  });
  const dateValidationResults = Object.fromEntries(
    sample.requests.map((request) => [request.outageDate, { isValid: true }]),
  );
  const requestApi = {
    async getTransformersByNumbers(numbers) {
      return transformers.filter((item) => numbers.includes(item.transformerNumber));
    },
    async getBranches(workCenterId) {
      return workCenterId === center.id ? [branch] : [];
    },
  };
  const load = createTypescriptLoader(root, { '@/lib/api/client': requestApi });
  const { validateAndTransformCSVRows } = load('app/power-outage-requests/create/utils/csvValidation.ts');
  const result = await validateAndTransformCSVRows(
    sample.requests.map((request, index) => ({
      physicalRow: index + 2,
      outageDate: request.outageDate,
      startTime: request.startTime,
      endTime: request.endTime,
      workCenterName: sample.names.workCenterName,
      branchName: sample.names.branchName,
      transformerNumber: request.transformerNumber,
      gisDetails: request.gisDetails,
      area: request.area,
    })),
    {
      role: 'ADMIN',
      workCenters: [center],
      dateValidationResults,
    },
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.validData.length, 2);
  assert.deepEqual(result.validData.map((item) => item.transformerNumber), ['DEMO_TR001', 'DEMO_TR002']);
  assert.deepEqual(result.validData.map((item) => item.workCenterId), [String(center.id), String(center.id)]);
  assert.deepEqual(result.validData.map((item) => item.branchId), [String(branch.id), String(branch.id)]);
});
