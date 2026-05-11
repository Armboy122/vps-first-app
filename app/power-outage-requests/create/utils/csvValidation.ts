/**
 * csvValidation.ts
 *
 * ยูทิลิตี้สำหรับการ parse และ validate ข้อมูล CSV
 * ของระบบสร้างคำขอดับไฟ
 *
 * ความรับผิดชอบของไฟล์นี้:
 *   - parseCSVLine: แยก field ใน CSV line รองรับ quoted fields
 *   - formatTime: แปลงรูปแบบเวลาที่หลากหลายให้เป็น HH:MM
 *   - parseDate: แปลง string วันที่ให้เป็น dayjs object
 *   - validateAndTransformCSVRows: ตรวจสอบและแปลงแถว CSV เป็น PowerOutageRequestInput[]
 *
 * ส่วน UI state (upload, display results) อยู่ใน CSVImport.tsx
 */

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  getBusinessDaysUntilOutage,
  getCalendarDaysUntilOutage,
  getMinOutageBusinessDateString,
  MIN_OUTAGE_BUSINESS_DAYS,
  MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";
import { searchTransformers } from "@/app/api/action/powerOutageRequest";

dayjs.extend(customParseFormat);

// ===================================================
// Types
// ===================================================

export interface CSVRow {
  outageDate?: string;
  startTime?: string;
  endTime?: string;
  workCenterName?: string;
  branchName?: string;
  transformerNumber?: string;
  gisDetails?: string;
  area?: string;
}

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ValidateCSVOptions {
  role: string;
  workCenters: { id: number; name: string }[];
  userWorkCenterId?: string;
  userBranch?: string;
}

export interface ValidateCSVResult {
  validData: PowerOutageRequestInput[];
  errors: CSVValidationError[];
}

// ===================================================
// CSV Line Parser
// ===================================================

/**
 * แยก field ใน CSV line หนึ่งบรรทัด
 * รองรับ quoted fields ที่มีเครื่องหมายจุลภาคอยู่ภายใน
 */
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

// ===================================================
// Time Formatter
// ===================================================

/**
 * แปลงรูปแบบเวลาหลากหลายให้เป็น HH:MM
 * รองรับ: HH:MM, H:MM, HHMM, HMM, HH.MM, H.MM
 * คืนค่า "" หากรูปแบบไม่ถูกต้อง
 */
export const formatTime = (timeInput: string): string => {
  if (!timeInput?.trim()) return "";

  const cleanTime = timeInput.trim();

  // รูปแบบ HH:MM หรือ H:MM
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, "0")}:${minutes}`;
    }
  }

  // รูปแบบ HH:MM:SS (ตัด seconds ออก)
  const timeWithSec = cleanTime.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (timeWithSec) {
    const [, hours, minutes] = timeWithSec;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, "0")}:${minutes}`;
    }
  }

  // Excel decimal fraction (0.333333 = 08:00, 0.5 = 12:00, 0.75 = 18:00)
  const decimalVal = parseFloat(cleanTime);
  if (!isNaN(decimalVal) && decimalVal > 0 && decimalVal < 1) {
    const totalMinutes = Math.round(decimalVal * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
  }

  // รูปแบบ HHMM หรือ HMM (เช่น 0800, 830)
  const numericTime = cleanTime.replace(/[^\d]/g, "");
  if (numericTime.length >= 3 && numericTime.length <= 4) {
    let hours: string, minutes: string;
    if (numericTime.length === 3) {
      hours = numericTime.slice(0, 1);
      minutes = numericTime.slice(1);
    } else {
      hours = numericTime.slice(0, 2);
      minutes = numericTime.slice(2);
    }
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
  }

  // รูปแบบ H.M หรือ HH.MM (ใช้จุดแทนโคลอน)
  const dotTimeMatch = cleanTime.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (dotTimeMatch) {
    const [, hours, minutes] = dotTimeMatch;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
  }

  return "";
};

// ===================================================
// Date Parser
// ===================================================

/**
 * แปลง string วันที่เป็น dayjs object
 * รองรับรูปแบบ: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD
 * คืนค่า null หากไม่สามารถแปลงได้
 */
export const parseDate = (dateInput: string): dayjs.Dayjs | null => {
  if (!dateInput?.trim()) return null;

  const cleanDate = dateInput.trim();

  // Excel serial date number (e.g. 45800 → 2025-05-20)
  // Excel epoch is 1900-01-01 with a known bug (treats 1900 as leap year)
  const serialNum = parseFloat(cleanDate);
  if (!isNaN(serialNum) && serialNum > 40000 && serialNum < 60000 && !cleanDate.includes('/') && !cleanDate.includes('-')) {
    const excelEpoch = new Date(1899, 11, 30); // Excel day 0
    const jsDate = new Date(excelEpoch.getTime() + serialNum * 86400000);
    const parsed = dayjs(jsDate);
    if (parsed.isValid()) return parsed;
  }

  // Standard formats
  const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "YYYY/MM/DD"];

  for (const format of formats) {
    const parsed = dayjs(cleanDate, format, true);
    if (parsed.isValid()) {
      // Handle Thai Buddhist year (พ.ศ.) — if year > 2400, subtract 543
      if (parsed.year() > 2400) {
        return parsed.subtract(543, "year");
      }
      return parsed;
    }
  }

  return null;
};

// ===================================================
// Main Validator
// ===================================================

/**
 * ตรวจสอบและแปลง array ของ CSVRow เป็น PowerOutageRequestInput[]
 *
 * ขั้นตอน:
 *  1. ตรวจสอบวันที่ดับไฟ (ต้องล่วงหน้าอย่างน้อย 10 วันทำการ)
 *  2. ตรวจสอบและแปลงเวลาเริ่มต้น/สิ้นสุด
 *  3. ตรวจสอบ transformer ผ่าน API
 *  4. ตรวจสอบ workCenter และ branch สำหรับ Admin
 *
 * @param rows - แถวที่ parse มาจาก CSV
 * @param options - role, workCenters, userWorkCenterId, userBranch
 */
export const validateAndTransformCSVRows = async (
  rows: CSVRow[],
  options: ValidateCSVOptions,
): Promise<ValidateCSVResult> => {
  const { role, workCenters, userWorkCenterId = "", userBranch = "" } = options;
  const validData: PowerOutageRequestInput[] = [];
  const errors: CSVValidationError[] = [];

  // Cache สำหรับ branches ของแต่ละ workCenter เพื่อลด API calls
  const branchCache = new Map<number, any[]>();

  if (!rows || rows.length === 0) {
    errors.push({
      row: 0,
      field: "ไฟล์",
      message: "ไม่พบข้อมูลในไฟล์ CSV กรุณาตรวจสอบว่าไฟล์มีข้อมูลอย่างน้อย 1 แถว",
      value: null,
    });
    return { validData, errors };
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2; // +2 เพราะมี header row และ index เริ่มจาก 0
    const rowErrors: CSVValidationError[] = [];

    // ข้ามแถวที่ว่างเปล่า
    const hasData = Object.values(row).some(
      (value) => value !== null && value !== undefined && value !== "",
    );
    if (!hasData) continue;

    // --------------------------------------------------
    // 1. ตรวจสอบวันที่ดับไฟ
    // --------------------------------------------------
    const parsedDate = parseDate(row.outageDate || "");
    if (!parsedDate) {
      rowErrors.push({
        row: rowNumber,
        field: "วันที่ดับไฟ",
        message:
          "วันที่ดับไฟไม่ถูกต้อง กรุณาระบุในรูปแบบ YYYY-MM-DD หรือ DD/MM/YYYY เช่น 2026-05-20",
        value: row.outageDate,
      });
    } else {
      const minDate = dayjs(getMinOutageBusinessDateString());
      const businessDaysFromToday =
        getBusinessDaysUntilOutage(parsedDate.format("YYYY-MM-DD")) ?? 0;
      const calendarDaysFromToday =
        getCalendarDaysUntilOutage(parsedDate.format("YYYY-MM-DD")) ?? 0;
      if (
        parsedDate.isBefore(minDate, "day") ||
        businessDaysFromToday < MIN_OUTAGE_BUSINESS_DAYS ||
        calendarDaysFromToday <= MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE
      ) {
        rowErrors.push({
          row: rowNumber,
          field: "วันที่ดับไฟ",
          message: `วันที่ดับไฟต้องอยู่ล่วงหน้าอย่างน้อย ${MIN_OUTAGE_BUSINESS_DAYS} วันทำการ และมากกว่า ${MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน — วันที่เลือก ${parsedDate.format("DD/MM/YYYY")} ห่างจากวันนี้ ${businessDaysFromToday} วันทำการ / ${calendarDaysFromToday} วันปฏิทิน (วันที่เร็วที่สุด: ${minDate.format("DD/MM/YYYY")})`,
          value: row.outageDate,
        });
      }
    }

    // --------------------------------------------------
    // 2. ตรวจสอบและแปลงเวลา
    // --------------------------------------------------
    const startTime = formatTime(row.startTime || "");
    const endTime = formatTime(row.endTime || "");

    if (!startTime) {
      rowErrors.push({
        row: rowNumber,
        field: "เวลาเริ่มต้น",
        message:
          "เวลาเริ่มต้นไม่ถูกต้อง กรุณาระบุในรูปแบบ HH:MM เช่น 08:00",
        value: row.startTime,
      });
    } else {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const workingStart = 6 * 60; // 06:00
      const workingEnd = 19 * 60 + 30; // 19:30
      if (startMinutes < workingStart || startMinutes > workingEnd) {
        rowErrors.push({
          row: rowNumber,
          field: "เวลาเริ่มต้น",
          message:
            "เวลาเริ่มต้นต้องอยู่ในช่วงเวลาทำการ 06:00 - 19:30 น.",
          value: row.startTime,
        });
      }
    }

    if (!endTime) {
      rowErrors.push({
        row: rowNumber,
        field: "เวลาสิ้นสุด",
        message:
          "เวลาสิ้นสุดไม่ถูกต้อง กรุณาระบุในรูปแบบ HH:MM เช่น 12:00",
        value: row.endTime,
      });
    } else {
      const [endHour, endMin] = endTime.split(":").map(Number);
      const endMinutes = endHour * 60 + endMin;
      const workingEndStart = 6 * 60 + 30; // 06:30
      const workingEnd = 20 * 60; // 20:00

      if (endMinutes < workingEndStart || endMinutes > workingEnd) {
        rowErrors.push({
          row: rowNumber,
          field: "เวลาสิ้นสุด",
          message: "เวลาสิ้นสุดต้องอยู่ในช่วง 06:30 - 20:00 น.",
          value: row.endTime,
        });
      }

      if (startTime) {
        const [startHour, startMin] = startTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        if (endMinutes <= startMinutes + 29) {
          rowErrors.push({
            row: rowNumber,
            field: "เวลาสิ้นสุด",
            message:
              "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที",
            value: row.endTime,
          });
        }
      }
    }

    // --------------------------------------------------
    // 3. ตรวจสอบ workCenter และ branch (Admin เท่านั้น)
    // --------------------------------------------------
    let workCenterId = userWorkCenterId;
    let branchId = userBranch;

    if (role === "ADMIN") {
      if (!row.workCenterName?.trim()) {
        rowErrors.push({
          row: rowNumber,
          field: "จุดรวมงาน",
          message: "กรุณาระบุชื่อจุดรวมงาน",
          value: row.workCenterName,
        });
      } else {
        const workCenter = workCenters.find(
          (wc) =>
            wc.name.toLowerCase().includes(row.workCenterName!.toLowerCase()) ||
            row.workCenterName!.toLowerCase().includes(wc.name.toLowerCase()),
        );

        if (!workCenter) {
          rowErrors.push({
            row: rowNumber,
            field: "จุดรวมงาน",
            message: `ไม่พบจุดรวมงาน "${row.workCenterName}" ในระบบ กรุณาตรวจสอบชื่อให้ถูกต้อง`,
            value: row.workCenterName,
          });
        } else {
          workCenterId = workCenter.id.toString();

          if (!row.branchName?.trim()) {
            rowErrors.push({
              row: rowNumber,
              field: "สาขา",
              message: "กรุณาระบุชื่อสาขา",
              value: row.branchName,
            });
          } else {
            try {
              // ใช้ cache เพื่อลด API calls ซ้ำ
              let branches = branchCache.get(workCenter.id);
              if (!branches) {
                branches = await getBranches(workCenter.id);
                branchCache.set(workCenter.id, branches);
              }

              const branch = branches.find(
                (b: any) =>
                  b.shortName
                    .toLowerCase()
                    .includes(row.branchName!.toLowerCase()) ||
                  row.branchName!
                    .toLowerCase()
                    .includes(b.shortName.toLowerCase()),
              );

              if (branch) {
                branchId = branch.id.toString();
              } else {
                rowErrors.push({
                  row: rowNumber,
                  field: "สาขา",
                  message: `ไม่พบสาขา "${row.branchName}" ในจุดรวมงาน "${row.workCenterName}" กรุณาตรวจสอบชื่อให้ถูกต้อง`,
                  value: row.branchName,
                });
              }
            } catch {
              rowErrors.push({
                row: rowNumber,
                field: "สาขา",
                message: `ไม่สามารถค้นหาสาขา "${row.branchName}" ได้ กรุณาลองใหม่อีกครั้ง`,
                value: row.branchName,
              });
            }
          }
        }
      }
    }

    // --------------------------------------------------
    // 4. ตรวจสอบหมายเลขหม้อแปลง
    // --------------------------------------------------
    let transformerNumber = "";
    let gisDetails = row.gisDetails?.trim() || "";

    if (!row.transformerNumber?.trim()) {
      rowErrors.push({
        row: rowNumber,
        field: "หมายเลขหม้อแปลง",
        message: "กรุณาระบุหมายเลขหม้อแปลง",
        value: row.transformerNumber,
      });
    } else {
      const rawTransformer = row.transformerNumber.trim();
      // แยก transformerNumber จาก label เช่น "TX001 - หน้าโรงเรียน"
      transformerNumber = rawTransformer.includes(" - ")
        ? rawTransformer.split(" - ")[0]
        : rawTransformer;

      try {
        const foundTransformers = await searchTransformers(transformerNumber);
        const exactMatch = foundTransformers.find(
          (t) => t.transformerNumber === transformerNumber,
        );

        if (!exactMatch) {
          rowErrors.push({
            row: rowNumber,
            field: "หมายเลขหม้อแปลง",
            message: `ไม่พบหม้อแปลงหมายเลข "${transformerNumber}" ในระบบ กรุณาตรวจสอบหมายเลขให้ถูกต้อง`,
            value: row.transformerNumber,
          });
        } else {
          // เติม gisDetails จากระบบถ้า CSV ไม่มี
          if (!gisDetails && exactMatch.gisDetails) {
            gisDetails = exactMatch.gisDetails;
          }
        }
      } catch {
        rowErrors.push({
          row: rowNumber,
          field: "หมายเลขหม้อแปลง",
          message: `ไม่สามารถตรวจสอบหม้อแปลง "${transformerNumber}" ได้ กรุณาลองใหม่อีกครั้ง`,
          value: row.transformerNumber,
        });
      }
    }

    // --------------------------------------------------
    // รวบรวมผลลัพธ์
    // --------------------------------------------------
    if (rowErrors.length === 0 && parsedDate) {
      try {
        validData.push({
          outageDate: parsedDate.format("YYYY-MM-DD"),
          startTime,
          endTime,
          workCenterId,
          branchId,
          transformerNumber,
          gisDetails,
          area: row.area?.trim() || null,
        });
      } catch {
        errors.push({
          row: rowNumber,
          field: "ทั่วไป",
          message: "เกิดข้อผิดพลาดในการแปลงข้อมูลแถวนี้",
          value: row,
        });
      }
    } else {
      errors.push(...rowErrors);
    }
  }

  return { validData, errors };
};
