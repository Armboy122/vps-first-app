/**
 * Re-export from the consolidated date utilities.
 * Single source of truth: lib/utils/date.utils.ts
 *
 * This file is kept for backward compatibility — all existing imports
 * from "@/lib/utils/dateUtils" continue to work without modification.
 */
export {
  getDaysFromToday,
  getMinSelectableDate,
  validateDateAndTime,
  formatThaiDate,
} from "@/lib/utils/date.utils";
