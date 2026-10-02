import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertCsvHeader, decodeUtf8Csv, parseCsvDocument } from "../lib/utils/csvDocument.ts";
import { canCreateOutageInScope } from "../lib/services/powerOutageAuthorization.ts";
import { isValidISODateKey, isWeekendDate } from "../lib/utils/date.utils.ts";
import { excelSerialToDateKey, formatImportTime, parseImportDateKey } from "../lib/utils/importValues.ts";
import { deduplicateTransformerRows } from "../lib/utils/transformerImport.ts";
import { PowerOutageRequestSchema } from "../lib/validations/powerOutageRequest.ts";
import { SECURITY_LIMITS } from "../app/admin/constants/admin.constants.ts";

const fixtureBytes = (name) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)));
const arrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const transformerHeaders = [["transformerNumber", "gisDetails"]];

test("CSV parser preserves BOM, CRLF, escaped quotes, embedded newlines, Thai text, and source row", () => {
  const rows = parseCsvDocument('\uFEFFname,description\r\n"หน่วยงาน","GIS, note with ""quote""\r\nand next line"\r\n');
  assert.deepEqual(rows, [
    { values: ["name", "description"], physicalRow: 1 },
    { values: ["หน่วยงาน", 'GIS, note with "quote"\r\nand next line'], physicalRow: 2 },
  ]);
});

test("UTF-8 fixture keeps blank physical lines out of records without renumbering later source rows", () => {
  const text = decodeUtf8Csv(arrayBuffer(fixtureBytes("complex-utf8.csv")));
  const rows = parseCsvDocument(text);

  assert.deepEqual(rows, [
    { values: ["transformerNumber", "gisDetails"], physicalRow: 1 },
    { values: ["101", 'สถานี, บ้าน "เหนือ"'], physicalRow: 3 },
    { values: ["102", "first line\nsecond line"], physicalRow: 5 },
    { values: ["103", "plain"], physicalRow: 8 },
  ]);
});

test("CSV parser rejects malformed quoting and non-whitespace after a closing quote", () => {
  assert.throws(() => parseCsvDocument('a,b\n"unfinished,c'), /Unclosed quoted field/);
  assert.throws(() => parseCsvDocument('a,b\n"quoted"x,c'), /Unexpected character after quoted field/);
});

test("header validation accepts exact case/space-normalized contracts and rejects structural mismatches", () => {
  assert.doesNotThrow(() => assertCsvHeader([" TransformerNumber ", "GISDETAILS"], transformerHeaders));

  for (const name of ["missing-column.csv", "wrong-order.csv", "duplicate-header.csv", "extra-column.csv"]) {
    const [header] = parseCsvDocument(decodeUtf8Csv(arrayBuffer(fixtureBytes(name))));
    assert.throws(() => assertCsvHeader(header.values, transformerHeaders), /header does not match/, name);
  }
});

test("header-only files have a valid header but no data records", () => {
  const records = parseCsvDocument(decodeUtf8Csv(arrayBuffer(fixtureBytes("header-only.csv"))));
  assert.equal(records.length, 1);
  assert.equal(records[0].physicalRow, 1);
  assert.doesNotThrow(() => assertCsvHeader(records[0].values, transformerHeaders));
});

test("outage and calendar header contracts accept only their supported ordered column sets", () => {
  const outageUser = ["วันที่ดับไฟ", "เวลาเริ่มต้น", "เวลาสิ้นสุด", "หมายเลขหม้อแปลง", "สถานที่ติดตั้ง (GIS)", "พื้นที่ไฟดับ"];
  const outageAdmin = ["วันที่ดับไฟ", "เวลาเริ่มต้น", "เวลาสิ้นสุด", "จุดรวมงาน", "สาขา", "หมายเลขหม้อแปลง", "สถานที่ติดตั้ง (GIS)", "พื้นที่ไฟดับ"];
  for (const accepted of [outageUser, outageAdmin]) assert.doesNotThrow(() => assertCsvHeader(accepted, [outageUser, outageAdmin]));
  assert.doesNotThrow(() => assertCsvHeader(["date", "name", "type"], [["date", "name", "type", "scope", "note", "isActive"], ["date", "name", "type"]]));
  assert.throws(() => assertCsvHeader([...outageUser].reverse(), [outageUser, outageAdmin]), /header does not match/);
  assert.throws(() => assertCsvHeader(["date", "type", "name"], [["date", "name", "type", "scope", "note", "isActive"], ["date", "name", "type"]]), /header does not match/);
});

test("CSV decoder rejects invalid UTF-8 rather than silently replacing bytes", () => {
  assert.throws(() => decodeUtf8Csv(arrayBuffer(fixtureBytes("invalid-utf8.csv"))), /UTF-8/);
  assert.equal(decodeUtf8Csv(new TextEncoder().encode("หมายเลข,รายละเอียด").buffer), "หมายเลข,รายละเอียด");
});

test("strict ISO date validation accepts leap days and rejects impossible calendar dates", () => {
  assert.equal(isValidISODateKey("2024-02-29"), true);
  assert.equal(isValidISODateKey("2025-02-29"), false);
  assert.equal(isValidISODateKey("2026-02-30"), false);
  assert.equal(isValidISODateKey("2026-13-01"), false);
  assert.equal(isValidISODateKey("2026-2-03"), false);
});

test("Thai weekday rules use the date key rather than the host timezone", () => {
  assert.equal(isWeekendDate("2026-10-03"), true); // Saturday
  assert.equal(isWeekendDate("2026-10-04"), true); // Sunday
  assert.equal(isWeekendDate("2026-10-05"), false); // Monday
});

test("import date parser strictly validates supported Gregorian and Buddhist-year text formats", () => {
  for (const value of ["2024-02-29", "2024/02/29", "29/02/2024", "29-02-2024", "2567-02-29", "29/02/2567"]) {
    assert.equal(parseImportDateKey(value), "2024-02-29", value);
  }
  for (const value of ["2025-02-29", "2023/02/29", "31/04/2567", "2566-02-29", "2024-2-29", "02/29/2024", "not-a-date"]) {
    assert.equal(parseImportDateKey(value), null, value);
  }
});

test("Excel date serial conversion handles 1900 and 1904 systems and rejects serial 60", () => {
  assert.equal(excelSerialToDateKey(1), "1900-01-01");
  assert.equal(excelSerialToDateKey(59), "1900-02-28");
  assert.equal(excelSerialToDateKey(60), null); // Excel's fictitious 1900-02-29
  assert.equal(excelSerialToDateKey(61), "1900-03-01");
  assert.equal(excelSerialToDateKey(0), null);
  assert.equal(excelSerialToDateKey(0, true), "1904-01-01");
  assert.equal(excelSerialToDateKey(1, true), "1904-01-02");
  assert.equal(excelSerialToDateKey(0, true), excelSerialToDateKey(1_462));
  assert.equal(excelSerialToDateKey(2_958_465), "9999-12-31");
  assert.equal(excelSerialToDateKey(2_958_466), null);
  assert.equal(parseImportDateKey("61.9"), "1900-03-01"); // fractional date serials floor to their date
  assert.equal(parseImportDateKey("60.9"), null);
});

test("time parser normalizes supported forms and rejects malformed or out-of-day times", () => {
  const accepted = new Map([
    ["8:05", "08:05"],
    ["08:05", "08:05"],
    ["08:05:30", "08:05"],
    ["0800", "08:00"],
    ["830", "08:30"],
    ["8.5", "08:05"], // dot form treats the suffix as minutes, not a decimal fraction
    ["08.30", "08:30"],
    ["0.333333", "08:00"],
    ["0.5", "12:00"],
  ]);
  for (const [value, expected] of accepted) assert.equal(formatImportTime(value), expected, value);

  for (const value of ["", "24:00", "23:59.999", "08:60", "08:00:60", "abc0800", "0.5junk", "1", "0", "8.60"]) {
    assert.equal(formatImportTime(value), "", value);
  }
});

test("outage time window accepts both endpoints and enforces the 30-minute minimum", () => {
  const validRequest = (startTime, endTime) => PowerOutageRequestSchema.safeParse({
    outageDate: "2026-10-19",
    startTime,
    endTime,
    workCenterId: "1",
    branchId: "2",
    transformerNumber: "T-1",
    gisDetails: "",
    area: null,
  }).success;

  assert.equal(validRequest("06:00", "06:30"), true);
  assert.equal(validRequest("19:30", "20:00"), true);
  assert.equal(validRequest("08:00", "08:29"), false);
  assert.equal(validRequest("08:00", "08:30"), true);
  assert.equal(validRequest("05:59", "06:30"), false);
  assert.equal(validRequest("19:31", "20:00"), false);
  assert.equal(validRequest("19:30", "20:01"), false);
});

test("transformer duplicate filtering keeps first trimmed case-sensitive value and source rows", () => {
  const records = parseCsvDocument(decodeUtf8Csv(arrayBuffer(fixtureBytes("duplicate-transformers.csv"))));
  const input = records.slice(1).map(({ values, physicalRow }) => ({
    transformerNumber: values[0],
    gisDetails: values[1],
    physicalRow,
  }));
  const result = deduplicateTransformerRows(input);

  assert.deepEqual(result.uniqueRows, [
    { transformerNumber: "T-1", gisDetails: "first value", physicalRow: 2 },
    { transformerNumber: "T-2", gisDetails: "second value", physicalRow: 3 },
    { transformerNumber: "t-1", gisDetails: "different case is distinct", physicalRow: 5 },
  ]);
  assert.deepEqual(result.duplicates, [
    { transformerNumber: "T-1", physicalRow: 4, firstPhysicalRow: 2 },
    { transformerNumber: "T-1", physicalRow: 6, firstPhysicalRow: 2 },
  ]);
});

test("transformer deduplication spans a 250-row request boundary", () => {
  const input = Array.from({ length: 251 }, (_, index) => ({
    transformerNumber: `T-${String(index).padStart(3, "0")}`,
    gisDetails: `row-${index}`,
    physicalRow: index + 2,
  }));
  input[250] = { ...input[250], transformerNumber: "T-000", gisDetails: "duplicate after boundary", physicalRow: 253 };

  const result = deduplicateTransformerRows(input);
  assert.equal(result.uniqueRows.length, 250);
  assert.equal(result.duplicates.length, 1);
  assert.deepEqual(result.duplicates[0], { transformerNumber: "T-000", physicalRow: 253, firstPhysicalRow: 2 });
  assert.equal(result.uniqueRows[0].gisDetails, "row-0");
});

test("outage-create policy restricts USER to their own valid scope and denies non-creators", () => {
  const ownScope = { userWorkCenterId: 2, userBranchId: 5, workCenterId: 2, branchId: 5 };
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "USER" }), true);
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "USER", workCenterId: 3 }), false);
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "USER", branchId: 6 }), false);
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "USER", userWorkCenterId: 99 }), false);
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "USER", userBranchId: 99 }), false);
  for (const role of ["VIEWER", "MANAGER", "SUPERVISOR"]) {
    assert.equal(canCreateOutageInScope({ ...ownScope, role }), false);
  }
  assert.equal(canCreateOutageInScope({ ...ownScope, role: "ADMIN", workCenterId: 3, branchId: 6 }), true);
  for (const invalid of [0, -1, 1.5, Number.NaN]) {
    assert.equal(canCreateOutageInScope({ ...ownScope, role: "ADMIN", workCenterId: invalid }), false);
    assert.equal(canCreateOutageInScope({ ...ownScope, role: "ADMIN", branchId: invalid }), false);
  }
});

test("admin CSV UI limits stay bounded and explicit", () => {
  assert.equal(SECURITY_LIMITS.MAX_FILE_SIZE_MB, 10);
  assert.equal(SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD, 10_000);
  assert.equal(SECURITY_LIMITS.MAX_CALENDAR_ROWS_PER_UPLOAD, 500);
  assert.deepEqual(SECURITY_LIMITS.ALLOWED_FILE_TYPES, [".csv"]);
});
