import * as assert from "node:assert/strict";
import {
  BusinessDayCalendarConfig,
  getCalendarDaysUntilOutage,
  MIN_OUTAGE_BUSINESS_DAYS,
  MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE,
  validateOutageBusinessDate,
} from "./powerOutageRequest";

const calendarConfig: BusinessDayCalendarConfig = {
  holidayDateKeys: [],
  specialWorkdayDateKeys: [],
};

function assertInvalid(
  label: string,
  outageDate: string,
  fromDate: Date,
  expectedMessagePart: string,
  config = calendarConfig,
) {
  const validation = validateOutageBusinessDate(
    outageDate,
    fromDate,
    config,
  );

  assert.equal(validation.isValid, false, label);
  assert.match(validation.error ?? "", new RegExp(expectedMessagePart), label);
}

function assertValid(label: string, outageDate: string, fromDate: Date) {
  const validation = validateOutageBusinessDate(
    outageDate,
    fromDate,
    calendarConfig,
  );

  assert.equal(validation.isValid, true, label);
}

assert.equal(MIN_OUTAGE_BUSINESS_DAYS, 6);
assert.equal(MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE, 10);
assert.equal(
  getCalendarDaysUntilOutage("2026-05-11", new Date(2026, 4, 1)),
  10,
);

assertInvalid(
  "rejects fewer than 6 business days even when calendar days are more than 10",
  "2026-05-12",
  new Date(2026, 4, 1),
  "6 วันทำการ",
  {
    holidayDateKeys: ["2026-05-04", "2026-05-05", "2026-05-06"],
    specialWorkdayDateKeys: [],
  },
);

assertInvalid(
  "rejects exactly 10 calendar days even when there are enough business days",
  "2026-05-11",
  new Date(2026, 4, 1),
  "มากกว่า 10 วันปฏิทิน",
);

assertValid(
  "accepts at least 6 business days and more than 10 calendar days",
  "2026-05-15",
  new Date(2026, 4, 1),
);

console.log("powerOutageRequest creation lead-time rules passed");
