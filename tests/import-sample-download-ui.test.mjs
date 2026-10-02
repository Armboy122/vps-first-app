import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createTypescriptLoader } from './helpers/loadTypescript.mjs';
import { parseCsvDocument } from '../lib/utils/csvDocument.ts';
import {
  PREVIEW_BRANCHES,
  PREVIEW_TRANSFORMERS,
  PREVIEW_WORK_CENTERS,
} from '../prisma/fixtures/preview.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const center = { id: 101, name: PREVIEW_WORK_CENTERS[0].name };
const branchFixture = PREVIEW_BRANCHES.find((branch) => branch.isActorHome);
const branch = { id: 202, shortName: branchFixture.shortName, workCenterId: center.id };
const jsx = (type, props, key) => ({ type, props: props || {}, key });

function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}

function nodeText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  return node && typeof node === 'object' ? nodeText(node.props?.children) : '';
}

function makeHarness() {
  const formButton = function FormButton() {};
  const apiCalls = { branches: [], lookups: [], dates: [], calendar: [] };
  const api = {
    async getActiveBusinessCalendarDateMetadata(start, end) {
      apiCalls.calendar.push([start, end]);
      return [];
    },
    async validateOutageDatesForImport(dates) {
      apiCalls.dates.push(dates);
      return { success: true, results: Object.fromEntries(dates.map((date) => [date, { isValid: true }])) };
    },
    async getTransformersByNumbers(numbers) {
      apiCalls.lookups.push(numbers);
      return PREVIEW_TRANSFORMERS.filter((item) => numbers.includes(item.transformerNumber));
    },
    async getBranches(workCenterId) {
      apiCalls.branches.push(workCenterId);
      return [branch];
    },
  };
  let stateIndex = 0;
  const values = [];
  const react = {
    useState(initial) {
      const index = stateIndex++;
      values[index] = initial;
      return [initial, (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
    },
    useRef(initial) { return { current: initial }; },
  };
  const load = createTypescriptLoader(root, {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/forms': { FormButton: formButton },
    '@/lib/api/client': api,
    '@/lib/utils/importValues': { excelSerialToDateKey: () => null },
    '../../utils/csvValidation': {
      async validateAndTransformCSVRows() { return { validData: [], errors: [] }; },
      parseDate: () => null,
    },
    'lucide-react': { AlertTriangle: 'AlertTriangle', Download: 'Download', FileUp: 'FileUp', Trash2: 'Trash2' },
    xlsx: XLSX,
  });
  const { CSVImport } = load('app/power-outage-requests/create/components/csv-import/CSVImport.tsx');
  const view = CSVImport({ role: 'ADMIN', workCenters: [center], userWorkCenterId: '101', userBranch: '202', onImportData() {} });
  const buttons = descendants(view).filter((node) => node.type === formButton);
  const buttonWithText = (text) => buttons.find((node) => nodeText(node).includes(text));
  return { apiCalls, buttonWithText, view };
}

async function withBrowserPorts(work) {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalCreateUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const originalRevokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const files = { blobs: [], links: [] };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'a');
        const link = { href: '', download: '', click() { files.links.push({ href: this.href, download: this.download }); } };
        return link;
      },
    },
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value(blob) { files.blobs.push(blob); return `blob:sample-${files.blobs.length}`; },
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value() {} });
  try {
    await work(files);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
    if (originalCreateUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateUrl);
    else delete URL.createObjectURL;
    if (originalRevokeUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeUrl);
    else delete URL.revokeObjectURL;
  }
}

test('CSV sample button downloads UTF-8 with BOM, exact seeded rows, and dynamic API-validated dates', async () => {
  const harness = makeHarness();
  const button = harness.buttonWithText('ดาวน์โหลด CSV ตัวอย่าง');
  assert.ok(button, 'CSV sample download button is visible');
  await withBrowserPorts(async (files) => {
    await button.props.onClick();
    assert.equal(files.links[0].download, 'outage-import-sample.csv');
    const text = Buffer.from(await files.blobs[0].arrayBuffer()).toString('utf8');
    assert.ok(text.startsWith('\uFEFF'));
    const rows = parseCsvDocument(text.slice(1)).map((record) => record.values);
    assert.deepEqual(rows[0], ['วันที่ดับไฟ', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'จุดรวมงาน', 'สาขา', 'หมายเลขหม้อแปลง', 'สถานที่ติดตั้ง (GIS)', 'พื้นที่ไฟดับ']);
    assert.equal(rows.length, 3);
    assert.ok(rows[1][0] !== '2040-02-01');
    assert.equal(rows[1][3], PREVIEW_WORK_CENTERS[0].name);
    assert.equal(rows[1][4], branchFixture.shortName);
    assert.equal(rows[1][5], 'DEMO_TR001');
    assert.equal(rows[1][6], PREVIEW_TRANSFORMERS[0].gisDetails);
    assert.equal(rows[2][5], 'DEMO_TR002');
    assert.equal(harness.apiCalls.calendar.length, 1);
    assert.equal(harness.apiCalls.dates.length, 1);
    assert.equal(harness.apiCalls.lookups.length, 1);
  });
});

test('XLSX sample button builds a readable first-sheet workbook with the same rows and headers', async () => {
  const harness = makeHarness();
  const button = harness.buttonWithText('ดาวน์โหลด XLSX ตัวอย่าง');
  assert.ok(button, 'XLSX sample download button is visible');
  const originalWriteFile = XLSX.writeFile;
  let capturedWorkbook;
  let capturedName;
  try {
    XLSX.writeFile = (workbook, filename) => { capturedWorkbook = workbook; capturedName = filename; };
    await button.props.onClick();
  } finally {
    XLSX.writeFile = originalWriteFile;
  }
  assert.equal(capturedName, 'outage-import-sample.xlsx');
  const bytes = XLSX.write(capturedWorkbook, { bookType: 'xlsx', type: 'buffer' });
  const readback = XLSX.read(bytes, { type: 'buffer' });
  assert.equal(readback.SheetNames[0], 'คำขอดับไฟ');
  const rows = XLSX.utils.sheet_to_json(readback.Sheets[readback.SheetNames[0]], { header: 1, raw: false });
  assert.deepEqual(rows[0], ['วันที่ดับไฟ', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'จุดรวมงาน', 'สาขา', 'หมายเลขหม้อแปลง', 'สถานที่ติดตั้ง (GIS)', 'พื้นที่ไฟดับ']);
  assert.equal(rows.length, 3);
  assert.ok(rows[1][0] !== '2040-02-01');
  assert.equal(rows[1][3], PREVIEW_WORK_CENTERS[0].name);
  assert.equal(rows[1][4], branchFixture.shortName);
  assert.equal(rows[1][5], 'DEMO_TR001');
  assert.equal(rows[1][6], PREVIEW_TRANSFORMERS[0].gisDetails);
  assert.equal(rows[2][5], 'DEMO_TR002');
  assert.equal(harness.apiCalls.calendar.length, 1);
  assert.equal(harness.apiCalls.dates.length, 1);
  assert.equal(harness.apiCalls.lookups.length, 1);
});
