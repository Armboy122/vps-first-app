"use client";

/**
 * CSVImport component
 *
 * ความรับผิดชอบ:
 *   - จัดการ UI state (upload, show results, warnings)
 *   - อ่านและ parse ไฟล์ CSV
 *   - เรียกใช้ validateAndTransformCSVRows จาก utils/csvValidation
 *   - ส่งข้อมูลที่ถูกต้องกลับไปยัง parent ผ่าน onImportData
 *
 * Logic การ parse/validate ข้อมูลทั้งหมดอยู่ใน:
 *   app/power-outage-requests/create/utils/csvValidation.ts
 */

import React, { useState, useRef } from "react";
import {
  addBusinessDays,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { FormButton } from "@/components/forms";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  parseCSVLine,
  validateAndTransformCSVRows,
  type CSVValidationError,
  type CSVRow,
} from "../../utils/csvValidation";

interface CSVImportProps {
  role: string;
  workCenters?: { id: number; name: string }[];
  onImportData: (data: PowerOutageRequestInput[]) => void;
  userWorkCenterId?: string;
  userBranch?: string;
  existingRequests?: PowerOutageRequestInput[];
  onClearExistingRequests?: () => void;
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
  const [lastFileName, setLastFileName] = useState("");
  const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    errors: number;
    hasPartialData: boolean;
  } | null>(null);
  const [showExistingWarning, setShowExistingWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLastFileName(file.name);

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
      if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
        throw new Error("รองรับไฟล์ .xlsx, .xls หรือ .csv");
      }

      // ตรวจสอบขนาดไฟล์ (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
      }

      let rows: CSVRow[] = [];
      const isExcel = file.name.match(/\.(xlsx|xls)$/i);

      if (isExcel) {
        // ===== อ่านไฟล์ Excel (.xlsx / .xls) =====
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("ไม่พบ sheet ในไฟล์ Excel");

        const sheet = workbook.Sheets[sheetName];
        // raw: true เพื่อได้ค่าดิบของวันที่/เวลา แล้วแปลงใน parser
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
          defval: "",
        });

        if (jsonData.length < 2) throw new Error("ไฟล์ว่างเปล่าหรือมีแค่ header");

        const maxRows = 1000;
        if (jsonData.length > maxRows + 1) {
          throw new Error(`จำนวนแถวเกินขีดจำกัด (สูงสุด ${maxRows} แถว)`);
        }

        // Skip header (row 0), parse data rows
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i].map((v: any) => String(v ?? ""));
          const hasData = values.some((v: string) => v.trim() !== "");
          if (!hasData) continue;

          const row: CSVRow = {
            outageDate: values[0] || "",
            startTime: values[1] || "",
            endTime: values[2] || "",
          };

          let colIndex = 3;
          if (role === "ADMIN") {
            row.workCenterName = values[colIndex] || "";
            row.branchName = values[colIndex + 1] || "";
            colIndex += 2;
          }

          row.transformerNumber = values[colIndex] || "";
          row.gisDetails = values[colIndex + 1] || "";
          row.area = values[colIndex + 2] || "";

          rows.push(row);
        }
      } else {
        // ===== อ่านไฟล์ CSV =====
        const text = await file.text();
        const lines = text.split("\n").filter(line => line.trim());

        if (lines.length === 0) throw new Error("ไฟล์ว่างเปล่า");

        const maxRows = 1000;
        if (lines.length > maxRows + 1) {
          throw new Error(`จำนวนแถวเกินขีดจำกัด (สูงสุด ${maxRows} แถว)`);
        }

        void parseCSVLine(lines[0]);

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = parseCSVLine(line);

          const row: CSVRow = {
            outageDate: values[0]?.replace(/"/g, "") || "",
            startTime: values[1]?.replace(/"/g, "") || "",
            endTime: values[2]?.replace(/"/g, "") || "",
          };

          let colIndex = 3;
          if (role === "ADMIN") {
            row.workCenterName = values[colIndex]?.replace(/"/g, "") || "";
            row.branchName = values[colIndex + 1]?.replace(/"/g, "") || "";
            colIndex += 2;
          }

          row.transformerNumber = values[colIndex]?.replace(/"/g, "") || "";
          row.gisDetails = values[colIndex + 1]?.replace(/"/g, "") || "";
          row.area = values[colIndex + 2]?.replace(/"/g, "") || "";

          rows.push(row);
        }
      }

      // Delegate all validation logic to the utility function
      const { validData, errors: validationErrs } =
        await validateAndTransformCSVRows(rows, {
          role,
          workCenters,
          userWorkCenterId,
          userBranch,
        });

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
      console.error("Error reading file:", error);
      const errorMessage = error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์";
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
    const firstBusinessSample = dayjs(addBusinessDays(new Date(), 12)).format(
      "YYYY-MM-DD",
    );
    const secondBusinessSample = dayjs(addBusinessDays(new Date(), 15)).format(
      "YYYY-MM-DD",
    );

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
        firstBusinessSample,
        "08:00",
        "12:00",
        ...(role === "ADMIN" ? ["จุดรวมงานตัวอย่าง", "สาขาตัวอย่าง"] : []),
        "TX001",
        "หน้าโรงเรียนวัดใหม่",
        "หมู่บ้านเจริญสุข",
      ],
      [
        secondBusinessSample,
        "14:00",
        "17:30",
        ...(role === "ADMIN" ? ["นราธิวาส", "เมือง"] : []),
        "TX002",
        "หน้าตลาดสด",
        "ชุมชนบ้านใหม่",
      ],
    ];

    // สร้างไฟล์ .xlsx ด้วย SheetJS
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // ตั้งความกว้างคอลัมน์ให้อ่านง่าย
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    // ตั้ง format ให้คอลัมน์เวลาเป็น text เพื่อไม่ให้ Excel แปลงเป็นตัวเลข
    const timeColIndexes = [1, 2]; // startTime, endTime
    for (let r = 1; r <= sampleData.length; r++) {
      for (const c of timeColIndexes) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          ws[cellRef].t = "s"; // force text type
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "คำขอดับไฟ");
    XLSX.writeFile(wb, "template_power_outage_request.xlsx");
  };

  const resultTone = !importResults
    ? null
    : importResults.success === importResults.total
      ? {
          wrapper:
            "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100",
          badge: "bg-emerald-100 text-emerald-700",
          title: "นำเข้าข้อมูลสำเร็จทั้งหมด",
          description:
            "ระบบตรวจสอบไฟล์แล้วและเพิ่มทุกรายการเข้าฟอร์มเรียบร้อย คุณสามารถตรวจทานก่อนบันทึกได้ทันที",
        }
      : importResults.success > 0
        ? {
            wrapper:
              "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100",
            badge: "bg-amber-100 text-amber-700",
            title: "นำเข้าได้บางส่วน",
            description:
              "รายการที่ถูกต้องถูกเพิ่มเข้าฟอร์มแล้ว ส่วนรายการที่มีปัญหาถูกสรุปไว้ด้านล่างเพื่อให้กลับไปแก้ได้เร็วขึ้น",
          }
        : {
            wrapper:
              "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100",
            badge: "bg-rose-100 text-rose-700",
            title: "ยังไม่สามารถเพิ่มข้อมูลได้",
            description:
              "ไฟล์ถูกอ่านได้ แต่ยังไม่พบรายการที่ผ่านเงื่อนไข กรุณาดูรายละเอียดข้อผิดพลาดและอัปโหลดใหม่อีกครั้ง",
          };

  const visibleValidationErrors =
    importResults?.success && importResults.success > 0
      ? validationErrors.slice(0, 6)
      : validationErrors.slice(0, 10);

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

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
              CSV Import
            </div>
            <div>
              <h3 className="text-xl font-semibold text-emerald-900">
                นำเข้าคำขอดับไฟจากไฟล์ CSV
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-7 text-emerald-800">
                เหมาะสำหรับการเพิ่มหลายรายการในรอบเดียว ระบบจะอ่านไฟล์,
                ตรวจสอบความถูกต้องของแต่ละแถว และเพิ่มเฉพาะข้อมูลที่ผ่านเงื่อนไขให้ทันที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-emerald-800 sm:grid-cols-3">
            <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
              <p className="font-semibold text-emerald-900">สูงสุด 1,000 แถว</p>
              <p className="text-emerald-700">รองรับงาน batch แบบปลอดภัย</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
              <p className="font-semibold text-emerald-900">ไฟล์ไม่เกิน 10MB</p>
              <p className="text-emerald-700">ช่วยให้ parse และตรวจสอบได้เร็ว</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
              <p className="font-semibold text-emerald-900">เพิ่มเฉพาะแถวที่ผ่าน</p>
              <p className="text-emerald-700">แถวที่ผิดจะถูกสรุปให้แก้ง่าย</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? "กำลังประมวลผล..." : "📂 เลือกไฟล์ Excel / CSV"}
          </FormButton>

          <FormButton
            type="button"
            variant="secondary"
            onClick={downloadTemplate}
            className="border-green-300 text-green-600 bg-white hover:bg-green-50"
          >
            📋 ดาวน์โหลดแม่แบบ
          </FormButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {lastFileName && (
          <div className="mt-4 inline-flex items-center rounded-full border border-emerald-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm">
            ไฟล์ล่าสุด: {lastFileName}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-10 w-10 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <div>
                <h4 className="text-lg font-semibold text-sky-900">
                  กำลังตรวจสอบไฟล์ CSV
                </h4>
                <p className="mt-1 text-sm leading-7 text-sky-800">
                  ระบบกำลังอ่านไฟล์, แปลงข้อมูลแต่ละแถว และเช็กเงื่อนไขก่อนเพิ่มเข้าฟอร์ม
                </p>
                {lastFileName && (
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-sky-700">
                    {lastFileName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2 text-sm text-sky-800 sm:grid-cols-3">
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
                1. อ่านไฟล์และแยกข้อมูล
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
                2. ตรวจสอบรูปแบบและเงื่อนไข
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
                3. เพิ่มเฉพาะรายการที่ผ่าน
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ผลลัพธ์การนำเข้า */}
      {importResults && resultTone && (
        <div
          className={`rounded-2xl border p-5 shadow-sm ${resultTone.wrapper}`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] ${resultTone.badge}`}
              >
                Import Summary
              </div>
              <div>
                <h4 className="text-xl font-semibold text-slate-900">
                  {resultTone.title}
                </h4>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
                  {resultTone.description}
                </p>
              </div>
            </div>

            {lastFileName && (
              <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                  ไฟล์ที่ตรวจล่าสุด
                </p>
                <p className="mt-1 font-medium text-slate-900">{lastFileName}</p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                รายการทั้งหมด
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {importResults.total}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                จำนวนแถวที่อ่านจากไฟล์
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                เพิ่มเข้าฟอร์มแล้ว
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">
                {importResults.success}
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                พร้อมให้ตรวจทานและบันทึกต่อ
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">
                ต้องกลับไปแก้ไข
              </p>
              <p className="mt-2 text-3xl font-semibold text-rose-700">
                {importResults.errors}
              </p>
              <p className="mt-2 text-sm text-rose-800">
                ระบบยังไม่เพิ่มรายการส่วนนี้ให้
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <p className="text-[15px] font-semibold text-slate-900">
                สิ่งที่ควรทำต่อทันที
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                <li>ตรวจรายการที่ถูกเพิ่มในฟอร์มว่าถูกต้องครบถ้วน</li>
                <li>หากมีข้อมูลบางส่วนไม่ผ่าน ให้แก้ไฟล์ CSV แล้วอัปโหลดรอบใหม่เฉพาะส่วนที่เหลือ</li>
                <li>เมื่อพร้อมแล้วค่อยบันทึกคำขอทั้งหมดจากหน้าฟอร์มด้านบน</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <p className="text-[15px] font-semibold text-slate-900">
                แนวทางการอ่านผลลัพธ์
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                <li>หาก &quot;ต้องกลับไปแก้ไข&quot; เป็น 0 แปลว่ารอบนี้พร้อมใช้งานทั้งหมด</li>
                <li>หากมีทั้งสำเร็จและผิดพลาด แปลว่าเป็น partial import ไม่จำเป็นต้องเริ่มใหม่ทั้งไฟล์</li>
                <li>รายละเอียดข้อผิดพลาดด้านล่างถูกตัดให้เห็นเฉพาะส่วนสำคัญก่อนเพื่ออ่านง่ายขึ้น</li>
              </ul>
            </div>
          </div>

          {/* Action buttons: retry / dismiss */}
          <div className="mt-4 flex flex-wrap gap-3">
            {importResults.errors > 0 && (
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
              >
                อัปโหลดไฟล์ที่แก้แล้ว
              </FormButton>
            )}
            <FormButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportResults(null);
                setValidationErrors([]);
              }}
              className="border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
            >
              ปิดผลลัพธ์
            </FormButton>
          </div>
        </div>
      )}

      {/* รายการข้อผิดพลาด */}
      {validationErrors.length > 0 && importResults && (
        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            importResults.success > 0
              ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100"
              : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100"
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">
                {importResults.success > 0
                  ? "รายการที่ยังต้องกลับไปแก้ไข"
                  : "ยังไม่มีรายการที่ผ่านเงื่อนไข"}
              </h4>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {importResults.success > 0
                  ? "ระบบเก็บรายการที่ผ่านไว้ให้แล้ว ส่วนรายการด้านล่างเป็นจุดที่ต้องแก้ก่อนอัปโหลดเพิ่ม"
                  : "ลองไล่ดูข้อผิดพลาดตามแถวและคอลัมน์ด้านล่าง จากนั้นแก้ไฟล์ CSV แล้วอัปโหลดใหม่อีกครั้ง"}
              </p>
            </div>

            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] ${
                importResults.success > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {validationErrors.length} จุดที่ต้องตรวจ
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[15px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">แถว</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">ฟิลด์</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">
                      อาการที่พบ
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">
                      ค่าที่ระบบอ่านได้
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleValidationErrors.map((error, index) => (
                    <tr key={index} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {error.row}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{error.field}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {error.message}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex max-w-[220px] truncate rounded-full bg-slate-100 px-3 py-1 text-sm">
                          {error.value ? String(error.value) : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {validationErrors.length > visibleValidationErrors.length && (
            <p className="mt-3 text-sm text-slate-600">
              แสดง {visibleValidationErrors.length} รายการแรกจากทั้งหมด{" "}
              {validationErrors.length} จุดที่ต้องแก้
            </p>
          )}

          <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-[15px] font-semibold text-slate-900">วิธีแก้เร็วที่สุด</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>แก้แถวที่ขึ้น error จากไฟล์ CSV ต้นฉบับ</li>
              <li>บันทึกไฟล์ใหม่เป็น CSV (UTF-8)</li>
              <li>อัปโหลดเฉพาะไฟล์ที่แก้แล้วอีกครั้ง ระบบจะเพิ่มเฉพาะรายการที่ผ่านให้เหมือนเดิม</li>
            </ol>
          </div>
        </div>
      )}

      {/* คำแนะนำรูปแบบไฟล์ — collapsed by default to reduce visual noise */}
      <details className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100 shadow-sm group">
        <summary className="cursor-pointer select-none p-5 text-lg font-bold text-sky-900 list-none flex items-center justify-between">
          <span>รูปแบบไฟล์ CSV ที่ระบบอ่านได้</span>
          <span className="ml-2 text-sky-500 transition-transform group-open:rotate-180" aria-hidden="true">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <div className="px-5 pb-5 text-sm text-blue-800 space-y-2 leading-7">
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
            <li>File {'\u2192'} Save As {'\u2192'} เลือก CSV (UTF-8)</li>
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
      </details>
    </div>
  );
};
