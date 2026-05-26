import * as assert from "node:assert/strict";
import { PowerOutageRequestUpdateSchema } from "./powerOutageRequest";

const validUpdatePayload = {
  outageDate: "2026-06-15",
  startTime: "08:00",
  endTime: "09:00",
  area: "พื้นที่ทดสอบ",
};

assert.equal(
  PowerOutageRequestUpdateSchema.safeParse(validUpdatePayload).success,
  true,
  "accepts update payload with outageDate and valid time range",
);

const invalidTimeRange = PowerOutageRequestUpdateSchema.safeParse({
  ...validUpdatePayload,
  startTime: "09:00",
  endTime: "08:30",
});

assert.equal(
  invalidTimeRange.success,
  false,
  "rejects update payload when endTime is before startTime",
);
assert.match(
  invalidTimeRange.success ? "" : invalidTimeRange.error.message,
  /เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น/,
);

const outsideWorkingHours = PowerOutageRequestUpdateSchema.safeParse({
  ...validUpdatePayload,
  startTime: "05:30",
  endTime: "06:30",
});

assert.equal(
  outsideWorkingHours.success,
  false,
  "rejects update payload outside allowed working hours",
);
assert.match(
  outsideWorkingHours.success ? "" : outsideWorkingHours.error.message,
  /เวลาเริ่มต้นต้องอยู่ในช่วง/,
);

console.log("powerOutageRequest update rules passed");
