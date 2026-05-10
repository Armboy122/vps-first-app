import {
  format,
  differenceInDays,
  isAfter,
  isEqual,
  addDays,
} from "date-fns";
import { th } from "date-fns/locale";
import dayjs from "dayjs";

/**
 * ไฟล์ utility รวมศูนย์สำหรับจัดการวันและเวลาในแอปพลิเคชัน
 * Single source of truth รวม lib/date-utils.ts และ lib/utils/dateUtils.ts
 * รองรับการทำงานกับไทม์โซน UTC+7 (ประเทศไทย)
 */

// ─────────────────────────────────────────────
// Thailand timezone helpers (formerly lib/date-utils.ts)
// ─────────────────────────────────────────────

/**
 * สร้างวันที่ปัจจุบันในไทม์โซน UTC+7 (ประเทศไทย)
 * @returns Date วัตถุ Date ที่มีเวลาตามไทม์โซนไทย
 */
export function getThailandDate(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
  );
}

/**
 * สร้างวันที่ปัจจุบันในไทม์โซน UTC+7 และตั้งค่าเวลาเป็น 00:00:00
 * @returns Date วัตถุ Date ที่มีเวลา 00:00:00 ตามไทม์โซนไทย
 */
export function getThailandDateAtMidnight(): Date {
  const today = getThailandDate();
  today.setHours(0, 0, 0, 0);
  return today;
}

export type DateInput = Date | string;

export const DATE_ONLY_FORMAT = "yyyy-MM-dd";

function formatThailandDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const dateParts = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function toDateOnlyKey(date: DateInput): string {
  if (typeof date === "string") {
    const trimmedDate = date.trim();
    const dateOnlyMatch = trimmedDate.match(/^(\d{4}-\d{2}-\d{2})/);

    if (dateOnlyMatch) {
      return dateOnlyMatch[1];
    }

    const parsedDate = new Date(trimmedDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date value: ${date}`);
    }

    return formatThailandDateKey(parsedDate);
  }

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }

  return formatThailandDateKey(date);
}

export function createDateOnlyUtc(date: DateInput): Date {
  return new Date(`${toDateOnlyKey(date)}T00:00:00.000Z`);
}

export function createThailandDateOnly(date: DateInput): Date {
  return new Date(`${toDateOnlyKey(date)}T00:00:00+07:00`);
}

export function isWeekendDate(date: DateInput): boolean {
  const day = createThailandDateOnly(date).getDay();
  return day === 0 || day === 6;
}

export function isWeekendOnlyBusinessDay(date: DateInput): boolean {
  return !isWeekendDate(date);
}

export function addWeekendOnlyBusinessDays(
  startDate: DateInput,
  businessDays: number,
): Date {
  if (businessDays < 0) {
    throw new Error("businessDays must be zero or greater");
  }

  let currentDate = createThailandDateOnly(startDate);
  let addedBusinessDays = 0;

  while (addedBusinessDays < businessDays) {
    currentDate = addDays(currentDate, 1);
    if (isWeekendOnlyBusinessDay(currentDate)) {
      addedBusinessDays += 1;
    }
  }

  return currentDate;
}

export function countWeekendOnlyBusinessDaysBetween(
  startDate: DateInput,
  endDate: DateInput,
): number {
  let currentDate = createThailandDateOnly(startDate);
  const targetDate = createThailandDateOnly(endDate);
  let businessDays = 0;

  if (targetDate <= currentDate) {
    return 0;
  }

  while (currentDate < targetDate) {
    currentDate = addDays(currentDate, 1);
    if (isWeekendOnlyBusinessDay(currentDate)) {
      businessDays += 1;
    }
  }

  return businessDays;
}

/**
 * คำนวณความแตกต่างของวันระหว่างสองวันที่
 * @param dateA วันที่แรก
 * @param dateB วันที่สอง
 * @returns จำนวนวันที่แตกต่างกัน
 */
export function getDaysDifference(dateA: Date, dateB: Date): number {
  return differenceInDays(dateA, dateB);
}

/**
 * ตรวจสอบว่าวันที่อยู่ในอนาคตหรือไม่ เมื่อเทียบกับวันปัจจุบัน
 * @param date วันที่ที่ต้องการตรวจสอบ
 * @returns boolean true ถ้าวันที่อยู่ในอนาคต
 */
export function isDateInFuture(date: Date): boolean {
  const today = getThailandDateAtMidnight();
  return isAfter(date, today) || isEqual(date, today);
}

/**
 * แปลงวันและเวลาเป็น ISO string พร้อมกับรักษาไทม์โซน UTC+7
 * @param date วันที่
 * @param timeString เวลาในรูปแบบ HH:mm
 * @returns Date ที่รวมวันที่และเวลาพร้อมไทม์โซน UTC+7
 */
export function createThailandDateTime(
  date: Date | string,
  timeString: string,
): Date {
  if (!timeString || timeString.trim() === "") {
    throw new Error("Time string is required and cannot be empty");
  }

  const dateStr = typeof date === "string" ? date : format(date, "yyyy-MM-dd");

  const timeParts = timeString.split(":");
  if (timeParts.length !== 2) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected HH:MM format.`,
    );
  }

  const hourNum = parseInt(timeParts[0]);
  const minuteNum = parseInt(timeParts[1]);

  if (isNaN(hourNum) || isNaN(minuteNum)) {
    throw new Error(
      `Invalid time values: ${timeString}. Hours and minutes must be numbers.`,
    );
  }

  if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
    throw new Error(
      `Invalid time range: ${timeString}. Hours must be 0-23, minutes must be 0-59.`,
    );
  }

  const hours = hourNum.toString().padStart(2, "0");
  const minutes = minuteNum.toString().padStart(2, "0");
  const formattedTime = `${hours}:${minutes}`;

  const isoString = `${dateStr}T${formattedTime}:00+07:00`;

  const result = new Date(isoString);
  if (isNaN(result.getTime())) {
    throw new Error(`Failed to create valid Date from: ${isoString}`);
  }

  return result;
}

/**
 * จัดรูปแบบวันที่เป็นข้อความภาษาไทย (เช่น "1 มกราคม 2567")
 * @param date วันที่
 * @returns string วันที่ในรูปแบบไทย
 */
export function formatToThaiDate(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: th });
}

/**
 * รูปแบบวันที่เป็นวันในสัปดาห์ภาษาไทย (เช่น "วันจันทร์ที่ 1 มกราคม 2567")
 * @param date วันที่
 * @returns string วันในสัปดาห์ภาษาไทย
 */
export function formatToThaiDayAndDate(date: Date): string {
  return format(date, "eeee ที่ d MMMM yyyy", { locale: th });
}

// ─────────────────────────────────────────────
// Form / UI date helpers (formerly lib/utils/dateUtils.ts)
// ─────────────────────────────────────────────

/**
 * คำนวณจำนวนวันที่เหลือจากวันปัจจุบัน
 */
export const getDaysFromToday = (date: string): number | null => {
  if (!date) return null;
  const selectedDate = dayjs(date).startOf("day");
  const today = dayjs().startOf("day");
  return selectedDate.diff(today, "day");
};

/**
 * คำนวณวันที่ขั้นต่ำที่สามารถเลือกได้ (มากกว่า 10 วันจากวันปัจจุบัน)
 */
export const getMinSelectableDate = (): string => {
  const today = dayjs().startOf("day");
  const minDate = today.add(11, "day");
  return minDate.format("YYYY-MM-DD");
};

/**
 * ตรวจสอบความถูกต้องของวันที่และเวลา
 */
export const validateDateAndTime = (
  outageDate: string,
  minSelectableDate: string,
  startTime?: string,
  endTime?: string,
): { isValid: boolean; error?: string } => {
  const selectedDate = dayjs(outageDate).startOf("day");
  const minDate = dayjs(minSelectableDate).startOf("day");

  if (selectedDate.isBefore(minDate)) {
    return {
      isValid: false,
      error: `วันที่ดับไฟต้องเป็นวันที่ ${minDate.format("DD/MM/YYYY")} หรือหลังจากนั้น (มากกว่า 10 วันจากวันปัจจุบัน)`,
    };
  }

  if (startTime && endTime) {
    const startDateTime = dayjs(`${outageDate} ${startTime}`);
    const endDateTime = dayjs(`${outageDate} ${endTime}`);

    if (
      endDateTime.isSame(startDateTime) ||
      endDateTime.isBefore(startDateTime)
    ) {
      return {
        isValid: false,
        error: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
      };
    }
  }

  return { isValid: true };
};

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย (เช่น "1/1/2567")
 * ใช้ toLocaleDateString สำหรับรูปแบบตัวเลข
 * @see formatToThaiDate สำหรับรูปแบบชื่อเดือนเต็ม
 */
export const formatThaiDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return "ไม่พบข้อมูล";
  }
};
