import { formatImportTime, parseImportDateKey } from "@/lib/utils/importValues";
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
import { getBranches, getTransformersByNumbers } from "@/lib/api/client";

dayjs.extend(customParseFormat);

// ===================================================
// Types
// ===================================================

export interface CSVRow {
  physicalRow?: number;
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
  dateValidationResults?: Record<string, { isValid: boolean; error?: string }>;
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
export const formatTime = formatImportTime;

export const parseDate = (dateInput: string): dayjs.Dayjs | null => {
  const key = parseImportDateKey(dateInput);
  return key ? dayjs(key, "YYYY-MM-DD", true) : null;
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

  const numbers = Array.from(new Set(rows.map((row) => (row.transformerNumber || "").trim().split(" - ")[0]).filter((number) => Boolean(number) && number.length <= 100)));
  const transformerRows = await getTransformersByNumbers(numbers);
  const transformerByNumber = new Map(transformerRows.map((item) => [item.transformerNumber, item]));

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
    const rowNumber = row.physicalRow ?? index + 2;
    const rowErrors: CSVValidationError[] = [];

    // ข้ามแถวที่ว่างเปล่า
    const hasData = Object.entries(row).filter(([key]) => key !== "physicalRow").map(([, value]) => value).some(
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
      const dateKey = parsedDate.format("YYYY-MM-DD");
      const authoritative = options.dateValidationResults?.[dateKey];
      const minDate = dayjs(getMinOutageBusinessDateString());
      const businessDaysFromToday = getBusinessDaysUntilOutage(dateKey) ?? 0;
      const calendarDaysFromToday = getCalendarDaysUntilOutage(dateKey) ?? 0;
      const rejected = authoritative
        ? !authoritative.isValid
        : parsedDate.isBefore(minDate, "day") ||
          businessDaysFromToday < MIN_OUTAGE_BUSINESS_DAYS ||
          calendarDaysFromToday <= MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE;
      if (rejected) {
        rowErrors.push({
          row: rowNumber,
          field: "วันที่ดับไฟ",
          message: authoritative?.error ?? `วันที่ดับไฟต้องอยู่ล่วงหน้าอย่างน้อย ${MIN_OUTAGE_BUSINESS_DAYS} วันทำการ และมากกว่า ${MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน — วันที่เลือก ${parsedDate.format("DD/MM/YYYY")} ห่างจากวันนี้ ${businessDaysFromToday} วันทำการ / ${calendarDaysFromToday} วันปฏิทิน (วันที่เร็วที่สุด: ${minDate.format("DD/MM/YYYY")})`,
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
        const normalizeName = (value: string) => value.trim().toLocaleLowerCase();
        const matchingCenters = workCenters.filter(
          (wc) => normalizeName(wc.name) === normalizeName(row.workCenterName!),
        );
        const workCenter = matchingCenters.length === 1 ? matchingCenters[0] : undefined;

        if (!workCenter) {
          rowErrors.push({
            row: rowNumber,
            field: "จุดรวมงาน",
            message: matchingCenters.length > 1
              ? `ชื่อจุดรวมงาน "${row.workCenterName}" ไม่ชัดเจน กรุณาใช้ชื่อเต็มจากระบบ`
              : `ไม่พบจุดรวมงาน "${row.workCenterName}" ในระบบ กรุณาใช้ชื่อเต็มให้ตรงกับระบบ`,
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

              const matchingBranches = branches.filter((b: any) =>
                normalizeName(b.shortName) === normalizeName(row.branchName!) ||
                normalizeName(b.fullName || "") === normalizeName(row.branchName!),
              );
              const branch = matchingBranches.length === 1 ? matchingBranches[0] : undefined;

              if (branch) {
                branchId = branch.id.toString();
              } else {
                rowErrors.push({
                  row: rowNumber,
                  field: "สาขา",
                  message: matchingBranches.length > 1
                    ? `ชื่อสาขา "${row.branchName}" ไม่ชัดเจน กรุณาใช้ชื่อเต็มจากระบบ`
                    : `ไม่พบสาขา "${row.branchName}" ในจุดรวมงาน "${row.workCenterName}" กรุณาใช้ชื่อสาขาให้ตรงกับระบบ`,
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
        const exactMatch = transformerByNumber.get(transformerNumber);

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
