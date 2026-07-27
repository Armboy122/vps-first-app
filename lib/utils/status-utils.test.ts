import * as assert from "node:assert/strict";
import {
  getBusinessDaysDifference,
  getOmsUrgencyBucketKey,
} from "./status-utils";

const configuredCalendar = {
  holidayDateKeys: [
    "2026-07-28",
    "2026-07-29",
    "2026-07-30",
    "2026-07-31",
  ],
  specialWorkdayDateKeys: [],
};

const mondayJuly27 = new Date(2026, 6, 27);
const tuesdayAugust4 = new Date(2026, 7, 4);

assert.equal(
  getBusinessDaysDifference(
    tuesdayAugust4,
    mondayJuly27,
    configuredCalendar,
  ),
  3,
  "counts today, 3 August, and the outage date as remaining business days",
);

assert.equal(
  getOmsUrgencyBucketKey(
    tuesdayAugust4,
    mondayJuly27,
    configuredCalendar,
  ),
  "WITHIN_3_BUSINESS_DAYS",
  "places the 4 August outage in the within-three-days bucket",
);

assert.equal(
  getBusinessDaysDifference(
    tuesdayAugust4,
    new Date(2026, 6, 28),
    configuredCalendar,
  ),
  2,
  "does not count today when today is a configured holiday",
);

console.log("status-utils inclusive business-day rules passed");
