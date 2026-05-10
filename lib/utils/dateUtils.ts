/**
 * Re-export from the consolidated date utilities.
 * Single source of truth: lib/utils/date.utils.ts
 *
 * This file is kept for backward compatibility — all existing imports
 * from "@/lib/utils/dateUtils" continue to work without modification.
 */
export {
  type DateInput,
  DATE_ONLY_FORMAT,
  toDateOnlyKey,
  createDateOnlyUtc,
  createThailandDateOnly,
  isWeekendDate,
  isWeekendOnlyBusinessDay,
  addWeekendOnlyBusinessDays,
  countWeekendOnlyBusinessDaysBetween,
  getDaysFromToday,
  getMinSelectableDate,
  validateDateAndTime,
  formatThaiDate,
} from "@/lib/utils/date.utils";
