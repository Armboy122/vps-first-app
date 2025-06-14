"use client";
import React, { useState, useRef } from "react";
import readXlsxFile from "read-excel-file";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { FormButton } from "@/components/forms";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";
import { searchTransformers } from "@/app/api/action/powerOutageRequest";
import dayjs from "dayjs";

interface ExcelImportProps {
  role: string;
  workCenters?: { id: number; name: string }[];
  onImportData: (data: PowerOutageRequestInput[]) => void;
  userWorkCenterId?: string;
  userBranch?: string;
  existingRequests?: PowerOutageRequestInput[];
  onClearExistingRequests?: () => void;
}

interface ExcelRow {
  outageDate?: any;
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

export const ExcelImport: React.FC<ExcelImportProps> = ({
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
  } | null>(null);
  const [showExistingWarning, setShowExistingWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schema สำหรับการอ่าน Excel (เวลาเป็น string)
  const schema = {
    วันที่ดับไฟ: {
      prop: "outageDate",
      type: Date,
      required: true,
    },
    เวลาเริ่มต้น: {
      prop: "startTime",
      type: String,
      required: true,
    },
    เวลาสิ้นสุด: {
      prop: "endTime",
      type: String,
      required: true,
    },
    จุดรวมงาน: {
      prop: "workCenterName",
      type: String,
      required: role === "ADMIN",
    },
    สาขา: {
      prop: "branchName",
      type: String,
      required: role === "ADMIN",
    },
    หมายเลขหม้อแปลง: {
      prop: "transformerNumber",
      type: String,
      required: true,
    },
    "สถานที่ติดตั้ง (GIS)": {
      prop: "gisDetails",
      type: String,
      required: false,
    },
    พื้นที่ไฟดับ: {
      prop: "area",
      type: String,
      required: false,
    },
  };

  const formatTime = (timeInput: any): string => {
    if (!timeInput) return "";

    // หากเป็น string (แนะนำให้ใช้)
    if (typeof timeInput === "string") {
      const cleanTime = timeInput.trim();

      // รูปแบบ HH:MM หรือ H:MM
      const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        const h = parseInt(hours);
        const m = parseInt(minutes);

        // ตรวจสอบความถูกต้อง
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          return `${h.toString().padStart(2, "0")}:${minutes}`;
        }
      }

      // รูปแบบ HHMM หรือ HMM (เช่น 0800, 830)
      const numericTime = cleanTime.replace(/[^\d]/g, "");
      if (numericTime.length === 3 || numericTime.length === 4) {
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
    }

    // หากเป็น Date object (จาก Excel - ในกรณีที่ผู้ใช้ใช้ time format)
    if (timeInput instanceof Date) {
      return dayjs(timeInput).format("HH:mm");
    }

    // หากเป็นตัวเลข (serial number จาก Excel)
    if (typeof timeInput === "number") {
      // หากเป็นเลขเล็กกว่า 1 (เป็น fraction ของวัน)
      if (timeInput < 1) {
        const hours = Math.floor(timeInput * 24);
        const minutes = Math.floor((timeInput * 24 - hours) * 60);
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }

      // หากเป็นเลขใหญ่กว่า อาจเป็น HHMM format
      const timeStr = timeInput.toString();
      if (timeStr.length === 3 || timeStr.length === 4) {
        let hours, minutes;
        if (timeStr.length === 3) {
          hours = timeStr.slice(0, 1);
          minutes = timeStr.slice(1);
        } else {
          hours = timeStr.slice(0, 2);
          minutes = timeStr.slice(2);
        }

        const h = parseInt(hours);
        const m = parseInt(minutes);

        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        }
      }
    }

    return "";
  };

  const validateAndTransformData = async (
    rows: ExcelRow[],
  ): Promise<{
    validData: PowerOutageRequestInput[];
    errors: ValidationError[];
  }> => {
    const validData: PowerOutageRequestInput[] = [];
    const errors: ValidationError[] = [];

    // Cache สำหรับ branches ของแต่ละ workCenter
    const branchCache = new Map<number, any[]>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // +2 เพราะมี header และ index เริ่มจาก 0
      const rowErrors: ValidationError[] = [];

      // ตรวจสอบวันที่ดับไฟ
      if (!row.outageDate) {
        rowErrors.push({
          row: rowNumber,
          field: "วันที่ดับไฟ",
          message: "กรุณาระบุวันที่ดับไฟ",
          value: row.outageDate,
        });
      } else {
        // ตรวจสอบเงื่อนไขวันที่ (ต้องมากกว่าวันปัจจุบัน 10 วัน)
        const outageDate = dayjs(row.outageDate);
        const today = dayjs();
        const minDate = today.add(10, "day");

        if (!outageDate.isValid()) {
          rowErrors.push({
            row: rowNumber,
            field: "วันที่ดับไฟ",
            message: "รูปแบบวันที่ไม่ถูกต้อง",
            value: row.outageDate,
          });
        } else if (outageDate.isBefore(minDate, "day")) {
          const daysFromToday = outageDate.diff(today, "day");
          rowErrors.push({
            row: rowNumber,
            field: "วันที่ดับไฟ",
            message: `วันที่ดับไฟต้องมากกว่าวันปัจจุบันอย่างน้อย 10 วัน (วันที่เลือก: ${outageDate.format("DD/MM/YYYY")} - เหลือเพียง ${daysFromToday} วัน)`,
            value: row.outageDate,
          });
        }
      }

      // ตรวจสอบและแปลงเวลา
      const startTime = formatTime(row.startTime);
      const endTime = formatTime(row.endTime);

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
            // หากพบหม้อแปลง ให้ใช้ GIS จากระบบ (ถ้าไม่มีใน Excel)
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
      if (rowErrors.length === 0) {
        try {
          const outageDate = dayjs(row.outageDate).format("YYYY-MM-DD");

          validData.push({
            outageDate,
            startTime,
            endTime,
            workCenterId,
            branchId,
            transformerNumber: row.transformerNumber!.trim(),
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
      const { rows, errors } = await readXlsxFile(file, { schema });

      if (errors.length > 0) {
        console.warn("Excel parsing errors:", errors);
      }

      const { validData, errors: validationErrs } =
        await validateAndTransformData(rows as ExcelRow[]);

      setValidationErrors(validationErrs);
      setImportResults({
        total: rows.length,
        success: validData.length,
        errors: validationErrs.length,
      });

      if (validData.length > 0) {
        onImportData(validData);
      }
    } catch (error) {
      console.error("Error reading Excel file:", error);
      setValidationErrors([
        {
          row: 0,
          field: "ไฟล์",
          message: "ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์",
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
    ];

    const csvContent = [headers, ...sampleData]
      .map((row) => row.join(","))
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          📊 นำเข้าข้อมูลจากไฟล์ Excel
        </h3>
        <p className="text-sm text-blue-700 mb-2">
          อัปโหลดไฟล์ Excel เพื่อเพิ่มหลายรายการพร้อมกัน รองรับไฟล์ .xlsx และ
          .xls
        </p>
        <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <strong>การใส่เวลาใน Excel:</strong> สามารถพิมพ์เป็น string
                  ได้ เช่น &quot;08:00&quot;, &quot;0800&quot;, &quot;8:30&quot;
                  ระบบจะแปลงให้อัตโนมัติ และตรวจสอบกับเวลาทำการ (06:00-20:00)
                </p>
                <p>
                  <strong>เงื่อนไขวันที่:</strong>{" "}
                  วันที่ดับไฟต้องมากกว่าวันปัจจุบันอย่างน้อย 10 วัน
                  (วันที่เร็วที่สุดที่สามารถเลือกได้:{" "}
                  {dayjs().add(10, "day").format("DD/MM/YYYY")})
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessing ? "กำลังประมวลผล..." : "📂 เลือกไฟล์ Excel"}
          </FormButton>

          <FormButton
            type="button"
            variant="secondary"
            onClick={downloadTemplate}
            className="border-blue-300 text-blue-600 bg-white hover:bg-blue-50"
          >
            📋 ดาวน์โหลดแม่แบบ
          </FormButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
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
              <div className="text-gray-600">นำเข้าสำเร็จ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {importResults.errors}
              </div>
              <div className="text-gray-600">มีข้อผิดพลาด</div>
            </div>
          </div>
          {importResults.success > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                ✅ รายการที่นำเข้าสำเร็จได้ถูกเพิ่มเข้าในรายการรอการบันทึกแล้ว
                พร้อมเวลาและข้อมูลที่ตรวจสอบแล้ว (สามารถแก้ไขได้)
              </p>
            </div>
          )}
        </div>
      )}

      {/* แสดงข้อผิดพลาด */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-3">
            ⚠️ ข้อผิดพลาดที่พบ
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
                {validationErrors.map((error, index) => (
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
          </div>
          <div className="mt-3 text-sm text-red-700">
            💡 <strong>คำแนะนำ:</strong> กรุณาแก้ไขข้อผิดพลาดในไฟล์ Excel
            แล้วอัปโหลดใหม่
          </div>
        </div>
      )}

      {/* คำแนะนำรูปแบบไฟล์ */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">
          📝 รูปแบบไฟล์ Excel
        </h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>
            <strong>คอลัมน์ที่จำเป็น:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>วันที่ดับไฟ (รูปแบบ: YYYY-MM-DD หรือ DD/MM/YYYY)</li>
            <li>เวลาเริ่มต้น (รูปแบบ: 08:00 หรือ 0800 หรือ 8:00)</li>
            <li>เวลาสิ้นสุด (รูปแบบ: 12:00 หรือ 1200 หรือ 12:30)</li>
            {role === "ADMIN" && (
              <>
                <li>จุดรวมงาน (ชื่อจุดรวมงานที่มีในระบบ)</li>
                <li>สาขา (ชื่อสาขาที่มีในระบบ)</li>
              </>
            )}
            <li>หมายเลขหม้อแปลง (เช่น TX001, TX002) - จะตรวจสอบกับระบบ</li>
          </ul>
          <p>
            <strong>คอลัมน์เสริม:</strong> สถานที่ติดตั้ง (GIS), พื้นที่ไฟดับ
          </p>
          <p>
            <strong>หมายเหตุ:</strong> เวลาสามารถพิมพ์เป็น text ใน Excel
            ได้ง่ายกว่าการใช้ time format
          </p>
        </div>
      </div>
    </div>
  );
};
