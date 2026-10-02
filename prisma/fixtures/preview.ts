/**
 * Deterministic, entirely synthetic fixtures for the isolated preview branch.
 * This file must never contain credentials, real people, or production data.
 */

export const PREVIEW_SEED_ACTOR_EMPLOYEE_ID = "DEMO_ADMIN";
export const PREVIEW_FIXTURE_DATE_ANCHOR = "2026-10-01";

export const PREVIEW_WORK_CENTERS = Array.from({ length: 13 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return { name: `ศูนย์ทดสอบ${number}` };
});

export const PREVIEW_BRANCHES = PREVIEW_WORK_CENTERS.flatMap(
  (workCenter, centerIndex) => {
    const centerNumber = String(centerIndex + 1).padStart(2, "0");
    const branchCount = centerIndex === 12 ? 6 : 5;

    return Array.from({ length: branchCount }, (_, branchIndex) => {
      const branchNumber = String(branchIndex + 1).padStart(2, "0");
      const shortName = `สาขาทดสอบ${branchNumber}`;

      return {
        workCenterName: workCenter.name,
        shortName,
        fullName: `${shortName} ${workCenter.name}`,
        phoneNumber: null,
        // Keeps the intended actor's organization explicit and testable.
        isActorHome: centerIndex === 0 && branchIndex === 0,
        centerNumber,
      };
    });
  },
);

export const PREVIEW_TRANSFORMERS = Array.from({ length: 30 }, (_, index) => {
  const number = String(index + 1).padStart(3, "0");
  const transformerNumber = `DEMO_TR${number}`;

  return {
    transformerNumber,
    gisDetails: `ตำแหน่งทดสอบ ${transformerNumber}`,
  };
});

const previewOutageDateKeys = (() => {
  const dates: string[] = [];
  // Keep future fixtures deterministic and valid against the recorded
  // 2026-10-01 preview anchor. The first scheduled date is beyond the
  // current import-validation window and avoids seeded calendar exceptions.
  const date = new Date(Date.UTC(2026, 9, 13));

  while (dates.length < PREVIEW_TRANSFORMERS.length) {
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      dates.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
})();

const previewPastAndCurrentDates = [
  "2026-09-23",
  "2026-09-25",
  "2026-09-28",
  "2026-09-30",
  PREVIEW_FIXTURE_DATE_ANCHOR,
  PREVIEW_FIXTURE_DATE_ANCHOR,
  PREVIEW_FIXTURE_DATE_ANCHOR,
  PREVIEW_FIXTURE_DATE_ANCHOR,
] as const;

const previewStatusPairs = [
  { statusRequest: "CONFIRM", omsStatus: "NOT_ADDED" },
  { statusRequest: "CONFIRM", omsStatus: "PROCESSED" },
  { statusRequest: "CONFIRM", omsStatus: "CANCELLED" },
  { statusRequest: "CANCELLED", omsStatus: "NOT_ADDED" },
  { statusRequest: "CANCELLED", omsStatus: "PROCESSED" },
  { statusRequest: "CANCELLED", omsStatus: "CANCELLED" },
  { statusRequest: "NOT", omsStatus: "NOT_ADDED" },
  { statusRequest: "NOT", omsStatus: "PROCESSED" },
  { statusRequest: "NOT", omsStatus: "CANCELLED" },
] as const;

const previewTimes = [
  { startTime: "08:00", endTime: "09:30" },
  { startTime: "09:00", endTime: "10:30" },
  { startTime: "13:00", endTime: "14:30" },
  { startTime: "15:00", endTime: "16:30" },
] as const;

export const PREVIEW_OUTAGE_REQUESTS = PREVIEW_TRANSFORMERS.map(
  (transformer, index) => {
    const number = String(index + 1).padStart(2, "0");
    const time = previewTimes[index % previewTimes.length];
    const isPastOrCurrent = index >= 10 && index <= 17;
    const futureDateIndex = index < 10 ? index : index - 8;
    const status = previewStatusPairs[index % previewStatusPairs.length];

    return {
      seedKey: `preview-20261001-outage-${number}`,
      outageDate: isPastOrCurrent
        ? previewPastAndCurrentDates[index - 10]
        : previewOutageDateKeys[futureDateIndex],
      ...time,
      transformerNumber: transformer.transformerNumber,
      gisDetails: transformer.gisDetails,
      area: `พื้นที่ทดสอบ ${number}`,
      ...status,
    };
  },
);

export const PREVIEW_CALENDAR_EXCEPTIONS = [
  {
    date: "2026-10-05",
    type: "HOLIDAY",
    name: "วันหยุดทดสอบ 01",
    scope: "GLOBAL",
    note: "Synthetic preview calendar fixture.",
    isActive: true,
  },
  {
    date: "2026-10-10",
    type: "SPECIAL_WORKDAY",
    name: "วันทำงานพิเศษทดสอบ 01",
    scope: "GLOBAL",
    note: "Synthetic preview calendar fixture.",
    isActive: true,
  },
  {
    date: "2026-12-05",
    type: "HOLIDAY",
    name: "วันหยุดทดสอบ 02",
    scope: "GLOBAL",
    note: "Synthetic preview calendar fixture.",
    isActive: true,
  },
  {
    date: "2027-01-02",
    type: "SPECIAL_WORKDAY",
    name: "วันทำงานพิเศษทดสอบ 02",
    scope: "GLOBAL",
    note: "Synthetic preview calendar fixture.",
    isActive: true,
  },
] as const;

export const PREVIEW_FIXTURE_COUNTS = {
  workCenters: 13,
  branches: 66,
  transformers: 30,
  calendarExceptions: 4,
  outageRequests: 30,
} as const;
