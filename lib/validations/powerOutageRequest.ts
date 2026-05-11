// lib/validations/powerOutageRequest.ts

import { z } from "zod";

export const MIN_OUTAGE_BUSINESS_DAYS = 6;
export const MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE = 10;

export interface BusinessDayCalendarConfig {
  holidayDateKeys?: string[];
  specialWorkdayDateKeys?: string[];
}

type DateInput = string | Date | null | undefined;

const toLocalDateAtMidnight = (value: DateInput): Date | null => {
  if (!value) return null;

  const date =
    typeof value === "string"
      ? (() => {
          const [year, month, day] = value.split("-").map(Number);
          if (!year || !month || !day) return null;
          return new Date(year, month - 1, day);
        })()
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());

  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isOutageBusinessDay = (
  value: DateInput,
  calendarConfig?: BusinessDayCalendarConfig,
): boolean => {
  const date = toLocalDateAtMidnight(value);
  if (!date) return false;

  const dateKey = toLocalDateKey(date);
  const holidayDateKeys = new Set(calendarConfig?.holidayDateKeys || []);
  const specialWorkdayDateKeys = new Set(
    calendarConfig?.specialWorkdayDateKeys || [],
  );

  if (specialWorkdayDateKeys.has(dateKey)) return true;
  if (holidayDateKeys.has(dateKey)) return false;

  const day = date.getDay();
  return day !== 0 && day !== 6;
};

export const addBusinessDays = (
  date: Date,
  businessDays: number,
  calendarConfig?: BusinessDayCalendarConfig,
): Date => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isOutageBusinessDay(result, calendarConfig)) added++;
  }

  return result;
};

export const getMinOutageBusinessDate = (
  fromDate = new Date(),
  calendarConfig?: BusinessDayCalendarConfig,
): Date => {
  const today = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const minBusinessDate = addBusinessDays(
    today,
    MIN_OUTAGE_BUSINESS_DAYS,
    calendarConfig,
  );
  const minCalendarDate = new Date(today);
  minCalendarDate.setDate(
    minCalendarDate.getDate() + MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE + 1,
  );

  const minDate =
    minBusinessDate > minCalendarDate ? minBusinessDate : minCalendarDate;

  while (!isOutageBusinessDay(minDate, calendarConfig)) {
    minDate.setDate(minDate.getDate() + 1);
  }

  return minDate;
};

export const getMinOutageBusinessDateString = (
  fromDate = new Date(),
  calendarConfig?: BusinessDayCalendarConfig,
): string => {
  const minDate = getMinOutageBusinessDate(fromDate, calendarConfig);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, "0");
  const day = String(minDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getBusinessDaysUntilOutage = (
  outageDate: DateInput,
  fromDate = new Date(),
  calendarConfig?: BusinessDayCalendarConfig,
): number | null => {
  const selectedDate = toLocalDateAtMidnight(outageDate);
  const today = toLocalDateAtMidnight(fromDate);
  if (!selectedDate || !today) return null;

  let cursor = new Date(today);
  let count = 0;

  while (cursor < selectedDate) {
    cursor.setDate(cursor.getDate() + 1);
    if (isOutageBusinessDay(cursor, calendarConfig)) count++;
  }

  return count;
};

export const getCalendarDaysUntilOutage = (
  outageDate: DateInput,
  fromDate = new Date(),
): number | null => {
  const selectedDate = toLocalDateAtMidnight(outageDate);
  const today = toLocalDateAtMidnight(fromDate);
  if (!selectedDate || !today) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((selectedDate.getTime() - today.getTime()) / msPerDay);
};

export const validateOutageBusinessDate = (
  outageDate: DateInput,
  fromDate = new Date(),
  calendarConfig?: BusinessDayCalendarConfig,
): { isValid: boolean; error?: string; minDate: Date; businessDays: number | null } => {
  const selectedDate = toLocalDateAtMidnight(outageDate);
  const minDate = getMinOutageBusinessDate(fromDate, calendarConfig);
  const businessDays = getBusinessDaysUntilOutage(
    outageDate,
    fromDate,
    calendarConfig,
  );
  const calendarDays = getCalendarDaysUntilOutage(outageDate, fromDate);

  if (!selectedDate || businessDays === null || calendarDays === null) {
    return {
      isValid: false,
      error: "วันที่ดับไฟไม่ถูกต้อง",
      minDate,
      businessDays,
    };
  }

  if (!isOutageBusinessDay(selectedDate, calendarConfig)) {
    return {
      isValid: false,
      error: "วันที่ดับไฟต้องเป็นวันทำการ",
      minDate,
      businessDays,
    };
  }

  if (calendarDays <= MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE) {
    return {
      isValid: false,
      error: `วันที่ดับไฟต้องห่างจากวันปัจจุบันมากกว่า ${MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน`,
      minDate,
      businessDays,
    };
  }

  if (businessDays < MIN_OUTAGE_BUSINESS_DAYS) {
    return {
      isValid: false,
      error: `วันที่ดับไฟต้องล่วงหน้าอย่างน้อย ${MIN_OUTAGE_BUSINESS_DAYS} วันทำการ`,
      minDate,
      businessDays,
    };
  }

  return { isValid: true, minDate, businessDays };
};

export const PowerOutageRequestSchema = z
  .object({
    outageDate: z
      .string()
      .min(1, "กรุณากดเลือกวันที่ดับไฟจากปฏิทิน"),
    startTime: z
      .string()
      .min(1, "กรุณาเลือกเวลาเริ่มต้นจากดรอปดาวน์ เช่น 08:00")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:MM เช่น 08:00",
      ),
    endTime: z
      .string()
      .min(1, "กรุณาเลือกเวลาสิ้นสุดจากดรอปดาวน์ เช่น 12:00")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "รูปแบบเวลาไม่ถูกต้อง ต้องเป็น HH:MM เช่น 12:00",
      ),
    workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงานจากรายการ"),
    branchId: z.string().min(1, "กรุณาเลือกสาขา (ต้องเลือกจุดรวมงานก่อน)"),
    transformerNumber: z
      .string()
      .min(1, "กรุณาพิมพ์ค้นหาและเลือกหมายเลขหม้อแปลงจากรายการ"),
    gisDetails: z.string(),
    area: z.string().nullable(),
  })
  .refine(
    (data) => {
      // ตรวจสอบเวลาทำการ (เริ่มได้ 06:00 - 19:30, สิ้นสุดไม่เกิน 20:00)
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);

      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      const workingStart = 6 * 60; // 06:00
      const latestStart = 19 * 60 + 30; // 19:30
      const workingEnd = 20 * 60; // 20:00

      return (
        startTimeInMinutes >= workingStart &&
        startTimeInMinutes <= latestStart &&
        endTimeInMinutes >= workingStart &&
        endTimeInMinutes <= workingEnd
      );
    },
    {
      message:
        "เวลาเริ่มต้นต้องอยู่ในช่วง 06:00 - 19:30 น. และเวลาสิ้นสุดต้องอยู่ในช่วง 06:30 - 20:00 น.",
      path: ["startTime"],
    },
  )
  .refine(
    (data) => {
      // ตรวจสอบว่าเวลาสิ้นสุดมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);

      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      return endTimeInMinutes > startTimeInMinutes + 29; // อย่างน้อย 30 นาที
    },
    {
      message:
        "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที เช่น เริ่ม 08:00 ต้องสิ้นสุดตั้งแต่ 08:30 เป็นต้นไป",
      path: ["endTime"],
    },
  );

// Schema สำหรับการ update (ไม่มี refine เพื่อให้ใช้ pick ได้)
export const PowerOutageRequestUpdateSchema = z.object({
  outageDate: z.string().min(1, "กรุณาเลือกวันที่ดับไฟ"),
  startTime: z
    .string()
    .min(1, "กรุณาระบุเวลาเริ่มต้น เช่น 08:00"),
  endTime: z
    .string()
    .min(1, "กรุณาระบุเวลาสิ้นสุด เช่น 12:00"),
  workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงาน"),
  branchId: z.string().min(1, "กรุณาเลือกสาขา"),
  transformerNumber: z
    .string()
    .min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
  gisDetails: z.string(),
  area: z.string().nullable(),
});

export type PowerOutageRequestInput = z.infer<typeof PowerOutageRequestSchema>;

export const GetAnnoucementRequest = z
  .object({
    workCenterId: z.string(),
    branchId: z.string(),
    outageDate: z.string(),
  })
  .refine(
    (data) => {
      return data.outageDate != "";
    },
    {
      message: "กรุณาระบุวันที่ดับไฟ",
      path: ["outageDate"],
    },
  )
  .refine(
    (data) => {
      return data.branchId != "";
    },
    {
      message: "กรุณาเลือกสาขาการไฟฟ้า",
      path: ["branchId"],
    },
  )
  .refine(
    (data) => {
      return data.workCenterId != "";
    },
    {
      message: "กรุณาเลือกจุดรวมงาน",
      path: ["workCenterId"],
    },
  );

export type GetAnnoucementRequestInput = z.infer<typeof GetAnnoucementRequest>;
