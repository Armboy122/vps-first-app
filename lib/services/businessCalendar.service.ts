import prisma from "@/lib/prisma";
import { BusinessCalendarDateType } from "@prisma/client";
import {
  addWeekendOnlyBusinessDays,
  countWeekendOnlyBusinessDaysBetween,
  createDateOnlyUtc,
  createThailandDateOnly,
  getThailandDateAtMidnight,
  isWeekendOnlyBusinessDay,
  toDateOnlyKey,
  type DateInput,
} from "@/lib/date-utils";
import { addDays } from "date-fns";

export const DEFAULT_BUSINESS_CALENDAR_SCOPE = "GLOBAL";
export const DEFAULT_MIN_LEAD_BUSINESS_DAYS = 6;
export const DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE = 10;

export interface BusinessCalendarOptions {
  scope?: string;
}

export interface BusinessCalendarEntry {
  id: number;
  date: Date;
  dateKey: string;
  type: BusinessCalendarDateType;
  name: string;
  scope: string;
  note: string | null;
  isActive: boolean;
}

export interface OutageDateValidationResult {
  isValid: boolean;
  error?: string;
  businessDaysUntilOutage?: number;
  calendarDaysUntilOutage?: number;
  earliestValidDate?: Date;
}

export class BusinessCalendarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessCalendarValidationError";
  }
}

function countCalendarDaysBetween(startDate: DateInput, endDate: DateInput): number {
  const start = createThailandDateOnly(startDate);
  const end = createThailandDateOnly(endDate);

  if (end <= start) {
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

function findEarliestValidWeekendOnlyOutageDate(
  startDate: DateInput,
  businessDays: number,
): Date {
  const start = createThailandDateOnly(startDate);
  const minBusinessDate = addWeekendOnlyBusinessDays(start, businessDays);
  const minCalendarDate = addDays(
    start,
    DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE + 1,
  );
  return minBusinessDate > minCalendarDate ? minBusinessDate : minCalendarDate;
}

function normalizeScope(scope?: string): string {
  const trimmedScope = scope?.trim();
  return trimmedScope || DEFAULT_BUSINESS_CALENDAR_SCOPE;
}

function mapEntry(entry: {
  id: number;
  date: Date;
  type: BusinessCalendarDateType;
  name: string;
  scope: string;
  note: string | null;
  isActive: boolean;
}): BusinessCalendarEntry {
  return {
    ...entry,
    dateKey: toDateOnlyKey(entry.date),
  };
}

export class BusinessCalendarService {
  static async getActiveEntries(
    startDate: DateInput,
    endDate: DateInput,
    options?: BusinessCalendarOptions,
  ): Promise<BusinessCalendarEntry[]> {
    const scope = normalizeScope(options?.scope);
    const startDateOnly = createDateOnlyUtc(startDate);
    const endDateOnly = createDateOnlyUtc(endDate);

    const entries = await prisma.businessCalendarDate.findMany({
      where: {
        scope,
        isActive: true,
        date: {
          gte: startDateOnly,
          lte: endDateOnly,
        },
      },
      orderBy: { date: "asc" },
    });

    return entries.map(mapEntry);
  }

  static async hasConfiguredCalendar(
    options?: BusinessCalendarOptions,
  ): Promise<boolean> {
    const scope = normalizeScope(options?.scope);
    const activeEntryCount = await prisma.businessCalendarDate.count({
      where: { scope, isActive: true },
    });

    return activeEntryCount > 0;
  }

  static async isBusinessDay(
    date: DateInput,
    options?: BusinessCalendarOptions,
  ): Promise<boolean> {
    const dateKey = toDateOnlyKey(date);
    const scope = normalizeScope(options?.scope);
    const entry = await prisma.businessCalendarDate.findUnique({
      where: {
        date_scope: {
          date: createDateOnlyUtc(dateKey),
          scope,
        },
      },
    });

    if (
      entry?.isActive &&
      entry.type === BusinessCalendarDateType.SPECIAL_WORKDAY
    ) {
      return true;
    }

    if (entry?.isActive && entry.type === BusinessCalendarDateType.HOLIDAY) {
      return false;
    }

    return isWeekendOnlyBusinessDay(dateKey);
  }

  static async countBusinessDaysBetween(
    startDate: DateInput,
    endDate: DateInput,
    options?: BusinessCalendarOptions,
  ): Promise<number> {
    const start = createThailandDateOnly(startDate);
    const end = createThailandDateOnly(endDate);

    if (end <= start) {
      return 0;
    }

    const entries = await this.getActiveEntries(start, end, options);
    const entriesByDate = new Map(
      entries.map((entry) => [entry.dateKey, entry]),
    );
    let currentDate = start;
    let businessDays = 0;

    while (currentDate < end) {
      currentDate = addDays(currentDate, 1);
      const dateKey = toDateOnlyKey(currentDate);
      const entry = entriesByDate.get(dateKey);

      if (entry?.type === BusinessCalendarDateType.SPECIAL_WORKDAY) {
        businessDays += 1;
        continue;
      }

      if (entry?.type === BusinessCalendarDateType.HOLIDAY) {
        continue;
      }

      if (isWeekendOnlyBusinessDay(dateKey)) {
        businessDays += 1;
      }
    }

    return businessDays;
  }

  static async addBusinessDays(
    startDate: DateInput,
    businessDays: number,
    options?: BusinessCalendarOptions,
  ): Promise<Date> {
    if (businessDays < 0) {
      throw new Error("businessDays must be zero or greater");
    }

    if (businessDays === 0) {
      return createThailandDateOnly(startDate);
    }

    let searchWindowDays = Math.max(21, businessDays * 3);

    while (searchWindowDays <= businessDays * 12 + 370) {
      const start = createThailandDateOnly(startDate);
      const end = addDays(start, searchWindowDays);
      const entries = await this.getActiveEntries(start, end, options);
      const entriesByDate = new Map(
        entries.map((entry) => [entry.dateKey, entry]),
      );
      let currentDate = start;
      let addedBusinessDays = 0;

      while (currentDate < end) {
        currentDate = addDays(currentDate, 1);
        const dateKey = toDateOnlyKey(currentDate);
        const entry = entriesByDate.get(dateKey);

        if (entry?.type === BusinessCalendarDateType.SPECIAL_WORKDAY) {
          addedBusinessDays += 1;
        } else if (entry?.type !== BusinessCalendarDateType.HOLIDAY) {
          if (isWeekendOnlyBusinessDay(dateKey)) {
            addedBusinessDays += 1;
          }
        }

        if (addedBusinessDays === businessDays) {
          return currentDate;
        }
      }

      searchWindowDays *= 2;
    }

    return addWeekendOnlyBusinessDays(startDate, businessDays);
  }

  static async validateOutageDate(
    outageDate: DateInput,
    minLeadBusinessDays: number = DEFAULT_MIN_LEAD_BUSINESS_DAYS,
    options?: BusinessCalendarOptions,
  ): Promise<OutageDateValidationResult> {
    const today = getThailandDateAtMidnight();
    const targetDate = createThailandDateOnly(outageDate);

    const businessDaysUntilOutage = await this.countBusinessDaysBetween(
      today,
      targetDate,
      options,
    );
    const calendarDaysUntilOutage = countCalendarDaysBetween(today, targetDate);

    if (calendarDaysUntilOutage <= DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE) {
      const earliestValidDate = await this.findEarliestValidOutageDate(
        today,
        minLeadBusinessDays,
        options,
      );

      return {
        isValid: false,
        error: `ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องห่างจากวันปัจจุบันมากกว่า ${DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน`,
        businessDaysUntilOutage,
        calendarDaysUntilOutage,
        earliestValidDate,
      };
    }

    if (businessDaysUntilOutage < minLeadBusinessDays) {
      const earliestValidDate = await this.findEarliestValidOutageDate(
        today,
        minLeadBusinessDays,
        options,
      );

      return {
        isValid: false,
        error: `ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องห่างจากวันปัจจุบันอย่างน้อย ${minLeadBusinessDays} วันทำการ`,
        businessDaysUntilOutage,
        calendarDaysUntilOutage,
        earliestValidDate,
      };
    }

    return {
      isValid: true,
      businessDaysUntilOutage,
      calendarDaysUntilOutage,
    };
  }

  private static async findEarliestValidOutageDate(
    startDate: DateInput,
    businessDays: number,
    options?: BusinessCalendarOptions,
  ): Promise<Date> {
    const start = createThailandDateOnly(startDate);
    const minBusinessDate = await this.addBusinessDays(
      start,
      businessDays,
      options,
    );
    const minCalendarDate = addDays(
      start,
      DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE + 1,
    );
    return minBusinessDate > minCalendarDate ? minBusinessDate : minCalendarDate;
  }

  static validateOutageDateWeekendOnly(
    outageDate: DateInput,
    minLeadBusinessDays: number = DEFAULT_MIN_LEAD_BUSINESS_DAYS,
  ): OutageDateValidationResult {
    const today = getThailandDateAtMidnight();

    const businessDaysUntilOutage = countWeekendOnlyBusinessDaysBetween(
      today,
      outageDate,
    );
    const calendarDaysUntilOutage = countCalendarDaysBetween(today, outageDate);

    if (calendarDaysUntilOutage <= DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE) {
      return {
        isValid: false,
        error: `ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องห่างจากวันปัจจุบันมากกว่า ${DEFAULT_MIN_LEAD_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน`,
        businessDaysUntilOutage,
        calendarDaysUntilOutage,
        earliestValidDate: findEarliestValidWeekendOnlyOutageDate(
          today,
          minLeadBusinessDays,
        ),
      };
    }

    if (businessDaysUntilOutage < minLeadBusinessDays) {
      return {
        isValid: false,
        error: `ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องห่างจากวันปัจจุบันอย่างน้อย ${minLeadBusinessDays} วันทำการ`,
        businessDaysUntilOutage,
        calendarDaysUntilOutage,
        earliestValidDate: addWeekendOnlyBusinessDays(
          today,
          minLeadBusinessDays,
        ),
      };
    }

    return {
      isValid: true,
      businessDaysUntilOutage,
      calendarDaysUntilOutage,
    };
  }
}
