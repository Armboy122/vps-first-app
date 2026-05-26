import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/api/action/powerOutageRequest.ts", "utf8");
const updateStart = source.indexOf("export async function updatePowerOutageRequest");
const updateEnd = source.indexOf("export async function updateOMS", updateStart);

assert.ok(updateStart >= 0, "updatePowerOutageRequest function exists");
assert.ok(updateEnd > updateStart, "updatePowerOutageRequest block is detectable");

const updateBlock = source.slice(updateStart, updateEnd);

assert.match(
  updateBlock,
  /currentUser\.role !== "ADMIN"/,
  "non-admin outageDate changes remain server-side forbidden",
);
assert.doesNotMatch(
  updateBlock,
  /validateOutageDateWithCalendar\(outageDate\)/,
  "admin outageDate updates must bypass business calendar lead-time validation",
);

console.log("powerOutageRequest admin outage date override passed");
