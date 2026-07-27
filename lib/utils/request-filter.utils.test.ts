import assert from "node:assert/strict";

import { matchesRequestDateFilters } from "@/lib/utils/request-filter.utils";

const requestCreatedBeforeItsOutage = {
  createdAt: new Date("2026-07-18T08:00:00.000Z"),
  outageDate: new Date("2026-08-06T00:00:00.000Z"),
};

assert.equal(
  matchesRequestDateFilters(requestCreatedBeforeItsOutage, {
    endDate: "",
    showPastOutageDates: false,
    startDate: "2026-08-06",
    today: new Date("2026-07-27T00:00:00.000Z"),
  }),
  true,
  "a request must match the start date by outageDate, regardless of createdAt",
);

assert.equal(
  matchesRequestDateFilters(requestCreatedBeforeItsOutage, {
    endDate: "2026-08-05",
    showPastOutageDates: true,
    startDate: "",
    today: new Date("2026-07-27T00:00:00.000Z"),
  }),
  false,
  "the outage end date must exclude later scheduled outages",
);

assert.equal(
  matchesRequestDateFilters(requestCreatedBeforeItsOutage, {
    endDate: "2026-08-06",
    showPastOutageDates: true,
    startDate: "2026-08-06",
    today: new Date("2026-07-27T00:00:00.000Z"),
  }),
  true,
  "the outage date range must include both boundaries",
);
