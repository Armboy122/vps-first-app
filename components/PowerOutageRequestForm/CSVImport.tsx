"use client";
import React, { useState, useRef } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { FormButton } from "@/components/forms";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";
import { searchTransformers } from "@/app/api/action/powerOutageRequest";
import dayjs from "dayjs";

interface CSVImportProps {
  role: string;
  workCenters?: { id: number; name: string }[];
  onImportData: (data: PowerOutageRequestInput[]) => void;
  userWorkCenterId?: string;
  userBranch?: string;
  existingRequests?: PowerOutageRequestInput[];
  onClearExistingRequests?: () => void;
}

interface CSVRow {
  outageDate?: string;
  startTime?: string;
  endTime?: string;
  workCenterName?: string;
  branchName?: string;
  transformerNumber?: string;
  gisDetails?: string;
  area?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export const CSVImport: React.FC<CSVImportProps> = ({
  role,
  workCenters = [],
  onImportData,
  userWorkCenterId,
  userBranch,
  existingRequests = [],
  onClearExistingRequests,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    errors: number;
    hasPartialData: boolean;
  } | null>(null);
  const [showExistingWarning, setShowExistingWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV line with proper handling of quoted fields
  const parseCSVLine = (line: string): string[] => {
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

  const formatTime = (timeInput: string): string => {
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

    // รูปแบบ HHMM หรือ HMM (เช่น 0800, 830)
    const numericTime = cleanTime.replace(/[^\d]/g, "");
    if (numericTime.length >= 3 && numericTime.length <= 4) {
      let hours, minutes;
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

  const parseDate = (dateInput: string): dayjs.Dayjs | null => {
    if (!dateInput?.trim()) return null;
    
    const cleanDate = dateInput.trim();
    
    // รองรับรูปแบบต่างๆ: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "YYYY/MM/DD"];
    
    for (const format of formats) {
      const parsed = dayjs(cleanDate, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }
    
    return null;
  };

  const validateAndTransformData = async (
    rows: CSVRow[],
  ): Promise<{
    validData: PowerOutageRequestInput[];
    errors: ValidationError[];
  }> => {
    const validData: PowerOutageRequestInput[] = [];
    const errors: ValidationError[] = [];

    // Cache สำหรับ branches ของแต่ละ workCenter
    const branchCache = new Map<number, any[]>();
    
    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (!rows || rows.length === 0) {
      errors.push({
        row: 0,
        field: "ไฟล์",
        message: "ไม่พบข้อมูลในไฟล์ CSV",
        value: null,
      });
      return { validData, errors };
    }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // +2 เพราะมี header และ index เริ่มจาก 0
      const rowErrors: ValidationError[] = [];
      
      // ตรวจสอบว่าแถวนี้มีข้อมูลหรือไม่ (skip empty rows)
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ""
      );
      
      if (!hasData) {
        continue; // ข้ามแถวที่ว่าง
      }

      // ตรวจสอบและแปลงวันที่ดับไฟ
      const parsedDate = parseDate(row.outageDate || "");
      if (!parsedDate) {
        rowErrors.push({
          row: rowNumber,
          field: "วันที่ดับไฟ",
          message: "กรุณาระบุวันที่ดับไฟ (รูปแบบ: YYYY-MM-DD หรือ DD/MM/YYYY)",
          value: row.outageDate,
        });
      } else {
        // ตรวจสอบเงื่อนไขวันที่ (ต้องมากกว่าวันปัจจุบัน 10 วัน)
        const today = dayjs();
        const minDate = today.add(10, "day");

        if (parsedDate.isBefore(minDate, "day")) {
          const daysFromToday = parsedDate.diff(today, "day");
          rowErrors.push({
            row: rowNumber,
            field: "วันที่ดับไฟ",
            message: `วันที่ดับไฟต้องมากกว่าวันปัจจุบันอย่างน้อย 10 วัน (วันที่เลือก: ${parsedDate.format("DD/MM/YYYY")} - เหลือเพียง ${daysFromToday} วัน)`,
            value: row.outageDate,
          });
        }
      }

      // ตรวจสอบและแปลงเวลา
      const startTime = formatTime(row.startTime || "");
      const endTime = formatTime(row.endTime || "");

      // ตรวจสอบเวลาเริ่มต้น
      if (!startTime) {
        rowErrors.push({
          row: rowNumber,
          field: "เวลาเริ่มต้น",
          message: "กรุณาระบุเวลาเริ่มต้น (รูปแบบ: HH:MM เช่น 08:00)",
          value: row.startTime,
        });
      } else {
        // ตรวจสอบช่วงเวลาทำการ (06:00 - 19:30)
        const [startHour, startMin] = startTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const workingStart = 6 * 60; // 06:00
        const workingEnd = 19 * 60 + 30; // 19:30

        if (startMinutes < workingStart || startMinutes > workingEnd) {
          rowErrors.push({
            row: rowNumber,
            field: "เวลาเริ่มต้น",
            message: "เวลาเริ่มต้นต้องอยู่ระหว่าง 06:00 - 19:30 น.",
            value: row.startTime,
          });
        }
      }

      // ตรวจสอบเวลาสิ้นสุด
      if (!endTime) {
        rowErrors.push({
          row: rowNumber,
          field: "เวลาสิ้นสุด",
          message: "กรุณาระบุเวลาสิ้นสุด (รูปแบบ: HH:MM เช่น 12:00)",
          value: row.endTime,
        });
      } else {
        // ตรวจสอบช่วงเวลาทำการ (06:30 - 20:00)
        const [endHour, endMin] = endTime.split(":").map(Number);
        const endMinutes = endHour * 60 + endMin;
        const workingEnd = 20 * 60; // 20:00

        if (endMinutes > workingEnd) {
          rowErrors.push({
            row: rowNumber,
            field: "เวลาสิ้นสุด",
            message: "เวลาสิ้นสุดต้องไม่เกิน 20:00 น.",
            value: row.endTime,
          });
        }

        // ตรวจสอบว่าเวลาสิ้นสุดมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที
        if (startTime) {
          const [startHour, startMin] = startTime.split(":").map(Number);
          const startMinutes = startHour * 60 + startMin;

          if (endMinutes <= startMinutes + 29) {
            rowErrors.push({
              row: rowNumber,
              field: "เวลาสิ้นสุด",
              message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที",
              value: row.endTime,
            });
          }
        }
      }

      // ตรวจสอบหมายเลขหม้อแปลง
      if (!row.transformerNumber?.trim()) {
        rowErrors.push({
          row: rowNumber,
          field: "หมายเลขหม้อแปลง",
          message: "กรุณาระบุหมายเลขหม้อแปลง",
          value: row.transformerNumber,
        });
      } else {
        // ตรวจสอบหม้อแปลงจาก API
        try {
          const transformerResults = await searchTransformers(
            row.transformerNumber.trim(),
          );
          if (transformerResults.length === 0) {
            rowErrors.push({
              row: rowNumber,
              field: "หมายเลขหม้อแปลง",
              message: `ไม่พบหมายเลขหม้อแปลง "${row.transformerNumber}" ในระบบ`,
              value: row.transformerNumber,
            });
          } else {
            // หากพบหม้อแปลง ให้ใช้ GIS จากระบบ (ถ้าไม่มีใน CSV)
            if (!row.gisDetails?.trim() && transformerResults[0].gisDetails) {
              row.gisDetails = transformerResults[0].gisDetails;
            }
          }
        } catch (error) {
          // หากเกิดข้อผิดพลาดในการค้นหา ให้เตือนแต่ไม่ขัดขวางการนำเข้า
          console.warn(
            `Error validating transformer ${row.transformerNumber}:`,
            error,
          );
        }
      }

      // ตรวจสอบจุดรวมงานและสาขา (สำหรับ Admin)
      let workCenterId = userWorkCenterId || "";
      let branchId = userBranch || "";

      if (role === "ADMIN") {
        if (!row.workCenterName?.trim()) {
          rowErrors.push({
            row: rowNumber,
            field: "จุดรวมงาน",
            message: "กรุณาระบุจุดรวมงาน",
            value: row.workCenterName,
          });
        } else {
          // ค้นหา workCenter ID จากชื่อ
          const workCenter = workCenters.find(
            (wc) =>
              wc.name
                .toLowerCase()
                .includes(row.workCenterName!.toLowerCase()) ||
              row.workCenterName!.toLowerCase().includes(wc.name.toLowerCase()),
          );

          if (!workCenter) {
            rowErrors.push({
              row: rowNumber,
              field: "จุดรวมงาน",
              message: `ไม่พบจุดรวมงาน "${row.workCenterName}" ในระบบ`,
              value: row.workCenterName,
            });
          } else {
            workCenterId = workCenter.id.toString();

            // ค้นหาสาขาจาก workCenterId
            if (row.branchName?.trim()) {
              try {
                // ตรวจสอบใน cache ก่อน
                let branches = branchCache.get(workCenter.id);
                if (!branches) {
                  branches = await getBranches(workCenter.id);
                  branchCache.set(workCenter.id, branches);
                }

                // ค้นหาสาขาที่ตรงกัน
                const branch = branches.find(
                  (b: any) =>
                    b.shortName
                      .toLowerCase()
                      .includes(row.branchName!.toLowerCase()) ||
                    row
                      .branchName!.toLowerCase()
                      .includes(b.shortName.toLowerCase()),
                );

                if (branch) {
                  branchId = branch.id.toString();
                } else {
                  rowErrors.push({
                    row: rowNumber,
                    field: "สาขา",
                    message: `ไม่พบสาขา "${row.branchName}" ในจุดรวมงาน "${row.workCenterName}"`,
                    value: row.branchName,
                  });
                }
              } catch (error) {
                rowErrors.push({
                  row: rowNumber,
                  field: "สาขา",
                  message: `เกิดข้อผิดพลาดในการค้นหาสาขา "${row.branchName}"`,
                  value: row.branchName,
                });
              }
            } else {
              rowErrors.push({
                row: rowNumber,
                field: "สาขา",
                message: "กรุณาระบุสาขา",
                value: row.branchName,
              });
            }
          }
        }
      }

      // หากไม่มี error ให้เพิ่มข้อมูลเข้า validData
      if (rowErrors.length === 0 && parsedDate) {
        try {
          const outageDate = parsedDate.format("YYYY-MM-DD");

          validData.push({
            outageDate,
            startTime,
            endTime,
            workCenterId,
            branchId,
            transformerNumber: (() => {
              // แยก transformerNumber จาก label ถ้ามี " - "
              const rawTransformer = row.transformerNumber!.trim();
              if (rawTransformer.includes(' - ')) {
                return rawTransformer.split(' - ')[0];
              }
              return rawTransformer;
            })(),
            gisDetails: row.gisDetails?.trim() || "",
            area: row.area?.trim() || null,
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: "ทั่วไป",
            message: "เกิดข้อผิดพลาดในการแปลงข้อมูล",
            value: row,
          });
        }
      } else {
        errors.push(...rowErrors);
      }
    }

    return { validData, errors };
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ตรวจสอบว่ามีรายการอยู่แล้วหรือไม่
    if (existingRequests.length > 0) {
      setShowExistingWarning(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);
    setImportResults(null);
    setShowExistingWarning(false);

    try {
      // ตรวจสอบไฟล์ก่อน
      if (!file.name.match(/\.(csv)$/i)) {
        throw new Error("กรุณาเลือกไฟล์ CSV (.csv)");
      }

      // ตรวจสอบขนาดไฟล์ (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
      }

      // อ่านไฟล์ CSV
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error("ไฟล์ว่างเปล่า");
      }

      // ตรวจสอบจำนวนแถว
      const maxRows = 1000;
      if (lines.length > maxRows + 1) { // +1 สำหรับ header
        throw new Error(`จำนวนแถวเกินขีดจำกัด (สูงสุด ${maxRows} แถว)`);
      }

      // Parse header
      const headerLine = lines[0];
      const expectedHeaders = [
        "วันที่ดับไฟ",
        "เวลาเริ่มต้น", 
        "เวลาสิ้นสุด",
        ...(role === "ADMIN" ? ["จุดรวมงาน", "สาขา"] : []),
        "หมายเลขหม้อแปลง",
        "สถานที่ติดตั้ง (GIS)",
        "พื้นที่ไฟดับ"
      ];

      const headers = parseCSVLine(headerLine);
      
      // Parse data rows
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        
        const row: CSVRow = {
          outageDate: values[0]?.replace(/"/g, '') || "",
          startTime: values[1]?.replace(/"/g, '') || "",
          endTime: values[2]?.replace(/"/g, '') || "",
        };

        let colIndex = 3;
        if (role === "ADMIN") {
          row.workCenterName = values[colIndex]?.replace(/"/g, '') || "";
          row.branchName = values[colIndex + 1]?.replace(/"/g, '') || "";
          colIndex += 2;
        }

        row.transformerNumber = values[colIndex]?.replace(/"/g, '') || "";
        row.gisDetails = values[colIndex + 1]?.replace(/"/g, '') || "";
        row.area = values[colIndex + 2]?.replace(/"/g, '') || "";

        rows.push(row);
      }

      const { validData, errors: validationErrs } =
        await validateAndTransformData(rows);

      setValidationErrors(validationErrs);
      setImportResults({
        total: rows.length,
        success: validData.length,
        errors: validationErrs.length,
        hasPartialData: validData.length > 0 && validationErrs.length > 0,
      });

      // เพิ่มข้อมูลที่ถูกต้องเข้าฟอร์มทันที
      if (validData.length > 0) {
        onImportData(validData);
      }
    } catch (error) {
      console.error("Error reading CSV file:", error);
      const errorMessage = error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบรูปแบบไฟล์";
      setValidationErrors([
        {
          row: 0,
          field: "ไฟล์",
          message: errorMessage,
          value: file.name,
        },
      ]);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "วันที่ดับไฟ",
      "เวลาเริ่มต้น",
      "เวลาสิ้นสุด",
      ...(role === "ADMIN" ? ["จุดรวมงาน", "สาขา"] : []),
      "หมายเลขหม้อแปลง",
      "สถานที่ติดตั้ง (GIS)",
      "พื้นที่ไฟดับ",
    ];

    const sampleData = [
      [
        dayjs().add(15, "day").format("YYYY-MM-DD"), // วันที่ที่ถูกต้องตามเงื่อนไข
        "08:00",
        "12:00",
        ...(role === "ADMIN" ? ["จุดรวมงานตัวอย่าง", "สาขาตัวอย่าง"] : []),
        "TX001",
        "หน้าโรงเรียนวัดใหม่",
        "หมู่บ้านเจริญสุข",
      ],
      [
        dayjs().add(20, "day").format("YYYY-MM-DD"),
        "14:00",
        "17:30",
        ...(role === "ADMIN" ? ["นราธิวาส", "เมือง"] : []),
        "TX002",
        "หน้าตลาดสด",
        "ชุมชนบ้านใหม่",
      ],
    ];

    const csvContent = [headers, ...sampleData]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_power_outage_request.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* แจ้งเตือนเมื่อมีรายการอยู่แล้ว */}
      {showExistingWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">
                มีรายการรอการบันทึกอยู่แล้ว
              </h4>
              <p className="text-sm text-yellow-700 mb-3">
                ขณะนี้มี {existingRequests.length} รายการในรายการรอการบันทึก
                หากต้องการนำเข้าข้อมูลใหม่ กรุณาล้างรายการเก่าก่อน
                หรือทำการบันทึกรายการที่มีอยู่แล้วก่อน
              </p>
              <div className="flex gap-3">
                {onClearExistingRequests && (
                  <FormButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onClearExistingRequests();
                      setShowExistingWarning(false);
                    }}
                    icon="🗑️"
                  >
                    ล้างรายการเก่า
                  </FormButton>
                )}
                <FormButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowExistingWarning(false)}
                >
                  ยกเลิก
                </FormButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          📋 นำเข้าข้อมูลจากไฟล์ CSV
        </h3>

        <div className="flex flex-wrap gap-3">
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? "กำลังประมวลผล..." : "📂 เลือกไฟล์ CSV"}
          </FormButton>

          <FormButton
            type="button"
            variant="secondary"
            onClick={downloadTemplate}
            className="border-green-300 text-green-600 bg-white hover:bg-green-50"
          >
            📋 ดาวน์โหลดแม่แบบ CSV
          </FormButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* ผลลัพธ์การนำเข้า */}
      {importResults && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">
            📈 ผลลัพธ์การนำเข้า
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {importResults.total}
              </div>
              <div className="text-gray-600">รายการทั้งหมด</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {importResults.success}
              </div>
              <div className="text-gray-600">เพิ่มเข้าฟอร์มแล้ว</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {importResults.errors}
              </div>
              <div className="text-gray-600">ไม่สามารถเพิ่มได้</div>
            </div>
          </div>
          {importResults.success > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                ✅ รายการที่ถูกต้องได้ถูกเพิ่มเข้าในฟอร์มแล้ว - คุณสามารถตรวจสอบและแก้ไขข้อมูลได้ตามต้องการ
              </p>
            </div>
          )}
          {importResults.hasPartialData && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-700">
                ⚠️ มีบางรายการที่ไม่สามารถเพิ่มได้ - ข้อมูลที่ถูกต้องได้ถูกเพิ่มเข้าฟอร์มแล้ว ส่วนข้อมูลที่มีปัญหาดูรายละเอียดด้านล่าง
              </p>
            </div>
          )}
        </div>
      )}

      {/* แสดงข้อผิดพลาด - เฉพาะกรณีที่ไม่มีข้อมูลถูกต้องเลย */}
      {validationErrors.length > 0 && importResults && importResults.success === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-3">
            ⚠️ ไม่สามารถเพิ่มข้อมูลใดๆ ได้ - ข้อผิดพลาดที่พบ
          </h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-3 py-2 text-left">แถว</th>
                  <th className="px-3 py-2 text-left">ฟิลด์</th>
                  <th className="px-3 py-2 text-left">ข้อผิดพลาด</th>
                  <th className="px-3 py-2 text-left">ค่าที่ได้รับ</th>
                </tr>
              </thead>
              <tbody>
                {validationErrors.slice(0, 10).map((error, index) => (
                  <tr key={index} className="border-b border-red-200">
                    <td className="px-3 py-2 font-medium">{error.row}</td>
                    <td className="px-3 py-2">{error.field}</td>
                    <td className="px-3 py-2 text-red-700">{error.message}</td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-32">
                      {error.value ? String(error.value) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validationErrors.length > 10 && (
              <div className="mt-2 text-sm text-red-600">
                ... และอีก {validationErrors.length - 10} ข้อผิดพลาด
              </div>
            )}
          </div>
          <div className="mt-3 text-sm text-red-700">
            💡 <strong>คำแนะนำ:</strong> กรุณาแก้ไขข้อผิดพลาดในไฟล์ CSV แล้วอัปโหลดใหม่
          </div>
        </div>
      )}
      
      {/* แสดงข้อผิดพลาดแบบย่อ - กรณีที่มีข้อมูลบางส่วนถูกต้อง */}
      {validationErrors.length > 0 && importResults && importResults.success > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-3">
            📋 รายการที่ไม่สามารถเพิ่มได้ ({validationErrors.length} รายการ)
          </h4>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>รายการที่มีปัญหา:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index}>
                  <strong>แถว {error.row}:</strong> {error.field} - {error.message}
                </li>
              ))}
              {validationErrors.length > 5 && (
                <li className="text-yellow-600">
                  ... และอีก {validationErrors.length - 5} ข้อผิดพลาด
                </li>
              )}
            </ul>
            <p className="mt-3 text-yellow-800">
              💡 <strong>คำแนะนำ:</strong> ข้อมูลที่ถูกต้องได้ถูกเพิ่มเข้าฟอร์มแล้ว 
              หากต้องการเพิ่มรายการที่เหลือ กรุณาแก้ไขข้อผิดพลาดในไฟล์ CSV แล้วอัปโหลดใหม่
            </p>
          </div>
        </div>
      )}

      {/* คำแนะนำรูปแบบไฟล์ */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">
          📝 รูปแบบไฟล์ CSV
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            <strong>คอลัมน์ที่จำเป็น (เรียงตามลำดับ):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>วันที่ดับไฟ (รูปแบบ: YYYY-MM-DD หรือ DD/MM/YYYY)</li>
            <li>เวลาเริ่มต้น (รูปแบบ: 08:00 หรือ 0800 หรือ 8.00)</li>
            <li>เวลาสิ้นสุด (รูปแบบ: 12:00 หรือ 1200 หรือ 12.30)</li>
            {role === "ADMIN" && (
              <>
                <li>จุดรวมงาน (ชื่อจุดรวมงานที่มีในระบบ)</li>
                <li>สาขา (ชื่อสาขาที่มีในระบบ)</li>
              </>
            )}
            <li>หมายเลขหม้อแปลง (เช่น TX001, TX002) - จะตรวจสอบกับระบบ</li>
            <li>สถานที่ติดตั้ง (GIS) - ไม่บังคับ</li>
            <li>พื้นที่ไฟดับ - ไม่บังคับ</li>
          </ul>
          <p>
            <strong>วิธีการสร้าง CSV:</strong>
          </p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>เปิด Excel หรือ Google Sheets</li>
            <li>ใส่ข้อมูลตามรูปแบบที่กำหนด</li>
            <li>File → Save As → เลือก CSV (UTF-8)</li>
            <li>อัปโหลดไฟล์ที่ได้</li>
          </ol>
          <p>
            <strong>ข้อดี CSV:</strong> ระบบรองรับการใส่ข้อมูลแบบยืดหยุ่น - ไม่จำเป็นต้องใช้ time format ใน Excel
            สามารถพิมพ์เป็น text ได้ตามรูปแบบต่างๆ ข้างต้น ระบบจะแปลงให้อัตโนมัติ
          </p>
          <p>
            <strong>ข้อจำกัด:</strong> ไฟล์สูงสุด 10MB, จำนวนแถวสูงสุด 1,000 แถว
          </p>
        </div>
      </div>
    </div>
  );
};