import { toDateOnlyKey } from "@/lib/utils/date.utils";

export interface RequestDateFields {
  createdAt: Date;
  outageDate: Date;
}

export interface RequestDateFilters {
  endDate: string;
  showPastOutageDates: boolean;
  startDate: string;
  today?: Date;
}

/**
 * The date controls on the request list describe the scheduled outage date,
 * not the date on which the request was created.
 */
export function matchesRequestDateFilters(
  request: RequestDateFields,
  {
    endDate,
    showPastOutageDates,
    startDate,
    today = new Date(),
  }: RequestDateFilters,
): boolean {
  const outageDateKey = toDateOnlyKey(request.outageDate);

  if (!showPastOutageDates && outageDateKey < toDateOnlyKey(today)) {
    return false;
  }

  if (startDate && outageDateKey < startDate) {
    return false;
  }

  if (endDate && outageDateKey > endDate) {
    return false;
  }

  return true;
}
