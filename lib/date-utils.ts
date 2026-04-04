/**
 * Re-export from the consolidated date utilities.
 * Single source of truth: lib/utils/date.utils.ts
 *
 * This file is kept for backward compatibility — all existing imports
 * from "@/lib/date-utils" continue to work without modification.
 */
export {
  getThailandDate,
  getThailandDateAtMidnight,
  getDaysDifference,
  isDateInFuture,
  createThailandDateTime,
  formatToThaiDate,
  formatToThaiDayAndDate,
} from "@/lib/utils/date.utils";
