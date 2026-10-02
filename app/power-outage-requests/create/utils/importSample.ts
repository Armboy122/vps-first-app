import {
  PREVIEW_BRANCHES,
  PREVIEW_OUTAGE_REQUESTS,
  PREVIEW_TRANSFORMERS,
  PREVIEW_WORK_CENTERS,
} from "@/prisma/fixtures/preview";
import {
  getActiveBusinessCalendarDateMetadata,
  getBranches,
  getTransformersByNumbers,
  validateOutageDatesForImport,
  type BranchDTO,
  type CalendarDateDTO,
  type TransformerDTO,
  type WorkCenterDTO,
} from "@/lib/api/client";
import type { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";

type SampleApi = {
  getActiveBusinessCalendarDateMetadata: (startDate: string, endDate: string) => Promise<CalendarDateDTO[]>;
  validateOutageDatesForImport: (dates: string[]) => Promise<
    | { success: true; results: Record<string, { isValid: boolean; error?: string }> }
    | { success: false; error: string }
  >;
  getTransformersByNumbers: (numbers: string[]) => Promise<TransformerDTO[]>;
  getBranches: (workCenterId: number) => Promise<BranchDTO[]>;
};

export interface BuildImportSampleOptions {
  role: string;
  workCenters: WorkCenterDTO[];
  userWorkCenterId?: string;
  userBranch?: string;
  now?: Date;
  api?: SampleApi;
}

export interface BuiltImportSample {
  requests: PowerOutageRequestInput[];
  names?: { workCenterName: string; branchName: string };
}

const api: SampleApi = {
  getActiveBusinessCalendarDateMetadata,
  validateOutageDatesForImport,
  getTransformersByNumbers,
  getBranches,
};

function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function candidateDateKeys(now: Date, maxDays = 180): string[] {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const keys: string[] = [];
  for (let daysAhead = 14; daysAhead <= maxDays; daysAhead += 1) {
    const candidate = new Date(today);
    candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
    const weekday = candidate.getUTCDay();
    if (weekday !== 0 && weekday !== 6) keys.push(dateKeyUtc(candidate));
  }
  return keys;
}

export async function buildImportSample({
  role,
  workCenters,
  userWorkCenterId,
  userBranch,
  now = new Date(),
  api: apiOverrides,
}: BuildImportSampleOptions): Promise<BuiltImportSample> {
  const client = apiOverrides ?? api;
  const seededTransformers = PREVIEW_TRANSFORMERS.slice(0, 2);
  const transformerRows = await client.getTransformersByNumbers(
    seededTransformers.map((transformer) => transformer.transformerNumber),
  );
  const transformerByNumber = new Map(transformerRows.map((row) => [row.transformerNumber, row]));
  for (const fixture of seededTransformers) {
    const actual = transformerByNumber.get(fixture.transformerNumber);
    if (!actual || actual.gisDetails !== fixture.gisDetails) {
      throw new Error("ยังไม่พบข้อมูลหม้อแปลงตัวอย่างในสภาพแวดล้อมพรีวิว กรุณาเตรียมข้อมูลจำลองก่อนดาวน์โหลดไฟล์");
    }
  }

  let workCenterId: string;
  let branchId: string;
  let workCenterName: string | undefined;
  let branchName: string | undefined;

  if (role === "ADMIN") {
    const fixtureCenter = PREVIEW_WORK_CENTERS[0];
    const center = workCenters.find((item) => item.name === fixtureCenter.name);
    const fixtureBranch = PREVIEW_BRANCHES.find((item) => item.isActorHome);
    if (!center || !fixtureBranch) {
      throw new Error("ยังไม่พบจุดรวมงานหรือสาขาตัวอย่างในสภาพแวดล้อมพรีวิว");
    }
    const branches = await client.getBranches(center.id);
    const branch = branches.find((item) => item.shortName === fixtureBranch.shortName);
    if (!branch || branch.workCenterId !== center.id) {
      throw new Error("ยังไม่พบสาขาตัวอย่างที่เชื่อมกับจุดรวมงานในสภาพแวดล้อมพรีวิว");
    }
    workCenterId = String(center.id);
    branchId = String(branch.id);
    workCenterName = center.name;
    branchName = branch.shortName;
  } else {
    const numericWorkCenterId = Number(userWorkCenterId);
    const numericBranchId = Number(userBranch);
    if (!Number.isSafeInteger(numericWorkCenterId) || numericWorkCenterId <= 0 || !Number.isSafeInteger(numericBranchId) || numericBranchId <= 0) {
      throw new Error("ไม่พบจุดรวมงานหรือสาขาที่กำหนดให้ผู้ใช้ปัจจุบัน");
    }
    const branches = await client.getBranches(numericWorkCenterId);
    if (!branches.some((item) => item.id === numericBranchId && item.workCenterId === numericWorkCenterId)) {
      throw new Error("ไม่พบสาขาที่กำหนดให้ผู้ใช้ปัจจุบันในจุดรวมงานนี้");
    }
    workCenterId = String(numericWorkCenterId);
    branchId = String(numericBranchId);
  }

  const candidates = candidateDateKeys(now).filter(
    (key) => !PREVIEW_OUTAGE_REQUESTS.some((request) => request.outageDate === key),
  );
  const calendarEntries = await client.getActiveBusinessCalendarDateMetadata(candidates[0], candidates[candidates.length - 1]);
  const holidays = new Set(calendarEntries.filter((entry) => entry.type === "HOLIDAY").map((entry) => entry.dateKey));
  const workdayCandidates = candidates.filter((key) => !holidays.has(key));
  const validation = await client.validateOutageDatesForImport(workdayCandidates);
  if (!validation.success) throw new Error(validation.error);

  const sampleDates = workdayCandidates.filter((key) => validation.results[key]?.isValid).slice(0, 2);
  if (sampleDates.length < 2) {
    throw new Error("ไม่พบวันที่ตัวอย่างที่ผ่านการตรวจสอบปฏิทินในช่วงเวลาที่กำหนด");
  }

  const requests = seededTransformers.map((transformer, index) => {
    const fixture = PREVIEW_OUTAGE_REQUESTS[index];
    return {
      outageDate: sampleDates[index],
      startTime: fixture.startTime,
      endTime: fixture.endTime,
      workCenterId,
      branchId,
      transformerNumber: transformer.transformerNumber,
      gisDetails: transformer.gisDetails,
      area: fixture.area,
    };
  });

  return {
    requests,
    ...(workCenterName && branchName ? { names: { workCenterName, branchName } } : {}),
  };
}

export function getImportSampleHeaders(role: string): string[] {
  return [
    "วันที่ดับไฟ",
    "เวลาเริ่มต้น",
    "เวลาสิ้นสุด",
    ...(role === "ADMIN" ? ["จุดรวมงาน", "สาขา"] : []),
    "หมายเลขหม้อแปลง",
    "สถานที่ติดตั้ง (GIS)",
    "พื้นที่ไฟดับ",
  ];
}

export function formatImportSampleRow(
  row: PowerOutageRequestInput,
  role: string,
  names?: { workCenterName?: string; branchName?: string },
): string[] {
  return [
    row.outageDate,
    row.startTime,
    row.endTime,
    ...(role === "ADMIN" ? [names?.workCenterName ?? "", names?.branchName ?? ""] : []),
    row.transformerNumber,
    row.gisDetails,
    row.area ?? "",
  ];
}
