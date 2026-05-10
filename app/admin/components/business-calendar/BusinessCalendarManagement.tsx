"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkImportBusinessCalendarDates,
  createBusinessCalendarDate,
  deleteBusinessCalendarDate,
  getBusinessCalendarDates,
  updateBusinessCalendarDate,
} from "@/app/api/action/businessCalendar";
import { useAdminContext } from "../../context/AdminContext";
import {
  BusinessCalendarDate,
  BusinessCalendarEntryType,
  BusinessCalendarFormData,
} from "../../types/admin.types";
import { PAGE_SIZE_OPTIONS, SECURITY_LIMITS } from "../../constants/admin.constants";
import { parseCSVLine, formatFileSize } from "../../utils/csvParser";
import { FeedbackBanner } from "../shared/FeedbackBanner";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorMessage } from "../shared/ErrorMessage";
import { ConfirmDialog } from "../shared/ConfirmDialog";

const TYPE_LABELS: Record<BusinessCalendarEntryType, string> = {
  HOLIDAY: "วันหยุด",
  SPECIAL_WORKDAY: "วันทำงานพิเศษ",
};

const EMPTY_FORM: BusinessCalendarFormData = {
  date: "",
  type: "HOLIDAY",
  name: "",
  scope: "GLOBAL",
  note: "",
  isActive: true,
};

function normalizeCSVType(value: string): BusinessCalendarEntryType | null {
  const normalized = value.trim().toUpperCase();

  if (normalized === "HOLIDAY" || normalized === "วันหยุด") {
    return "HOLIDAY";
  }

  if (
    normalized === "SPECIAL_WORKDAY" ||
    normalized === "WORKDAY" ||
    normalized === "วันทำงานพิเศษ"
  ) {
    return "SPECIAL_WORKDAY";
  }

  return null;
}

function normalizeCSVDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const thaiDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!thaiDateMatch) {
    return "";
  }

  const [, rawDay, rawMonth, rawYear] = thaiDateMatch;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
  const yearNumber = Number(rawYear);
  const year = yearNumber > 2400 ? String(yearNumber - 543) : rawYear;

  return `${year}-${month}-${day}`;
}

function formatThaiDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${Number(year) + 543}`;
}

function validateForm(data: BusinessCalendarFormData) {
  const errors: string[] = [];

  if (!data.date) errors.push("กรุณาเลือกวันที่");
  if (!data.name.trim()) errors.push("กรุณากรอกชื่อรายการ");
  if (!data.scope.trim()) errors.push("กรุณากรอก scope");
  if (data.name.length > 120) errors.push("ชื่อยาวเกินไป (สูงสุด 120 ตัวอักษร)");
  if (data.note.length > 500) errors.push("หมายเหตุยาวเกินไป (สูงสุด 500 ตัวอักษร)");

  return errors;
}

export function BusinessCalendarManagement() {
  const { businessCalendarSearchParams, updateBusinessCalendarSearchParams } =
    useAdminContext();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<BusinessCalendarFormData>(EMPTY_FORM);
  const [editingEntry, setEditingEntry] = useState<BusinessCalendarDate | null>(
    null,
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessCalendarDate | null>(
    null,
  );

  const calendarQuery = useQuery({
    queryKey: ["business-calendar", businessCalendarSearchParams],
    queryFn: () =>
      getBusinessCalendarDates(
        businessCalendarSearchParams.page,
        businessCalendarSearchParams.limit,
        businessCalendarSearchParams.search,
        businessCalendarSearchParams.type,
        businessCalendarSearchParams.includeInactive,
      ),
    staleTime: 60 * 1000,
    retry: 2,
  });

  const saveMutation = useMutation({
    mutationFn: (data: BusinessCalendarFormData) => {
      const payload = {
        date: data.date,
        type: data.type,
        name: data.name,
        scope: data.scope,
        note: data.note,
        isActive: data.isActive,
      };

      return editingEntry
        ? updateBusinessCalendarDate(editingEntry.id, payload)
        : createBusinessCalendarDate(payload);
    },
    onSuccess: (result) => {
      if (!result.success) {
        setServerError(result.error || "ไม่สามารถบันทึกรายการได้");
        return;
      }

      setServerError(null);
      setFormData(EMPTY_FORM);
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ["business-calendar"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBusinessCalendarDate(id),
    onSuccess: (result) => {
      if (!result.success) {
        setServerError(result.error || "ไม่สามารถลบรายการได้");
        return;
      }

      setDeleteTarget(null);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["business-calendar"] });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateForm(formData);

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setServerError(null);
    saveMutation.mutate(formData);
  };

  const handleEdit = (entry: BusinessCalendarDate) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.dateKey,
      type: entry.type,
      name: entry.name,
      scope: entry.scope,
      note: entry.note || "",
      isActive: entry.isActive,
    });
    setFormErrors([]);
    setServerError(null);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData(EMPTY_FORM);
    setFormErrors([]);
    setServerError(null);
  };

  const totalCount = calendarQuery.data?.totalCount || 0;
  const totalPages = calendarQuery.data?.totalPages || 0;
  const entries = calendarQuery.data?.entries || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ปฏิทินวันทำการ</h2>
        <p className="text-gray-600 mt-1">
          จัดการวันหยุดและวันทำงานพิเศษสำหรับการคำนวณวันทำการของคำขอดับไฟ
        </p>
      </div>

      <BusinessCalendarFilters />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  รายการปฏิทิน
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  ทั้งหมด {totalCount.toLocaleString()} รายการ
                </p>
              </div>
              <select
                value={businessCalendarSearchParams.limit}
                onChange={(event) =>
                  updateBusinessCalendarSearchParams({
                    limit: Number(event.target.value),
                  })
                }
                className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / หน้า
                  </option>
                ))}
              </select>
            </div>

            {calendarQuery.isLoading ? (
              <div className="p-8">
                <LoadingSpinner size="lg" text="กำลังโหลดปฏิทินวันทำการ..." />
              </div>
            ) : calendarQuery.error ? (
              <div className="p-6">
                <ErrorMessage
                  message="ไม่สามารถโหลดปฏิทินวันทำการได้"
                  retry={calendarQuery.refetch}
                />
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ไม่พบรายการปฏิทิน
                </h3>
                <p className="text-gray-600">
                  เพิ่มวันหยุดหรือวันทำงานพิเศษด้วยฟอร์มด้านข้าง
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ประเภท
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scope
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          การจัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {entries.map((entry) => (
                        <BusinessCalendarRow
                          key={entry.id}
                          entry={entry}
                          onEdit={handleEdit}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <BusinessCalendarPagination totalPages={totalPages} />
              </>
            )}
          </div>

          <BusinessCalendarCSVImport />
        </div>

        <div className="space-y-4">
          <BusinessCalendarForm
            formData={formData}
            setFormData={setFormData}
            isEditing={!!editingEntry}
            isLoading={saveMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
          />

          {formErrors.length > 0 && (
            <FeedbackBanner
              variant="error"
              title="ข้อมูลไม่ถูกต้อง"
              message={
                <ul className="space-y-1">
                  {formErrors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              }
            />
          )}

          {serverError && (
            <FeedbackBanner
              variant="error"
              title="ไม่สามารถดำเนินการได้"
              message={serverError}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="ลบรายการปฏิทิน"
        message={
          deleteTarget
            ? `ต้องการลบ ${deleteTarget.name} (${formatThaiDate(deleteTarget.dateKey)}) ใช่หรือไม่`
            : ""
        }
        confirmText="ลบรายการ"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function BusinessCalendarFilters() {
  const { businessCalendarSearchParams, updateBusinessCalendarSearchParams } =
    useAdminContext();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหา
          </label>
          <input
            type="text"
            value={businessCalendarSearchParams.search}
            onChange={(event) =>
              updateBusinessCalendarSearchParams({ search: event.target.value })
            }
            placeholder="ชื่อ, scope, หรือหมายเหตุ"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภท
          </label>
          <select
            value={businessCalendarSearchParams.type}
            onChange={(event) =>
              updateBusinessCalendarSearchParams({
                type: event.target.value as "" | BusinessCalendarEntryType,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">ทุกประเภท</option>
            <option value="HOLIDAY">วันหยุด</option>
            <option value="SPECIAL_WORKDAY">วันทำงานพิเศษ</option>
          </select>
        </div>

        <label className="flex items-end gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={businessCalendarSearchParams.includeInactive}
            onChange={(event) =>
              updateBusinessCalendarSearchParams({
                includeInactive: event.target.checked,
              })
            }
            className="mb-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="pb-2">แสดงรายการปิดใช้งาน</span>
        </label>
      </div>
    </div>
  );
}

function BusinessCalendarRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: BusinessCalendarDate;
  onEdit: (entry: BusinessCalendarDate) => void;
  onDelete: (entry: BusinessCalendarDate) => void;
}) {
  const typeClass =
    entry.type === "HOLIDAY"
      ? "bg-rose-100 text-rose-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatThaiDate(entry.dateKey)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeClass}`}>
          {TYPE_LABELS[entry.type]}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="font-medium">{entry.name}</div>
        {entry.note && (
          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
            {entry.note}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {entry.scope}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            entry.isActive
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {entry.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onEdit(entry)}
          className="text-blue-600 hover:text-blue-900 mr-4"
        >
          แก้ไข
        </button>
        <button
          onClick={() => onDelete(entry)}
          className="text-red-600 hover:text-red-900"
        >
          ลบ
        </button>
      </td>
    </tr>
  );
}

function BusinessCalendarPagination({ totalPages }: { totalPages: number }) {
  const { businessCalendarSearchParams, updateBusinessCalendarSearchParams } =
    useAdminContext();

  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
      <button
        onClick={() =>
          updateBusinessCalendarSearchParams({
            page: Math.max(1, businessCalendarSearchParams.page - 1),
          })
        }
        disabled={businessCalendarSearchParams.page <= 1}
        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
      >
        ก่อนหน้า
      </button>
      <span className="text-sm text-gray-600">
        หน้า {businessCalendarSearchParams.page} จาก {totalPages}
      </span>
      <button
        onClick={() =>
          updateBusinessCalendarSearchParams({
            page: Math.min(totalPages, businessCalendarSearchParams.page + 1),
          })
        }
        disabled={businessCalendarSearchParams.page >= totalPages}
        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
      >
        ถัดไป
      </button>
    </div>
  );
}

function BusinessCalendarForm({
  formData,
  setFormData,
  isEditing,
  isLoading,
  onSubmit,
  onCancel,
}: {
  formData: BusinessCalendarFormData;
  setFormData: Dispatch<SetStateAction<BusinessCalendarFormData>>;
  isEditing: boolean;
  isLoading: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const updateField = <K extends keyof BusinessCalendarFormData>(
    field: K,
    value: BusinessCalendarFormData[K],
  ) => setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          วันหยุดจะไม่นับเป็นวันทำการ ส่วนวันทำงานพิเศษจะนับแม้ตรงกับวันหยุดสุดสัปดาห์
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          วันที่ <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(event) => updateField("date", event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ประเภท <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.type}
          onChange={(event) =>
            updateField("type", event.target.value as BusinessCalendarEntryType)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="HOLIDAY">วันหยุด</option>
          <option value="SPECIAL_WORKDAY">วันทำงานพิเศษ</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อรายการ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(event) => updateField("name", event.target.value)}
          maxLength={120}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="เช่น วันสงกรานต์"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scope <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.scope}
          onChange={(event) => updateField("scope", event.target.value)}
          maxLength={60}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          หมายเหตุ
        </label>
        <textarea
          value={formData.note}
          onChange={(event) => updateField("note", event.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          placeholder="รายละเอียดเพิ่มเติม"
        />
        <div className="text-xs text-gray-500 mt-1">
          {formData.note.length}/500 ตัวอักษร
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        เปิดใช้งานรายการนี้
      </label>

      <div className="flex justify-end gap-3 pt-2">
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "กำลังบันทึก..." : isEditing ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
        </button>
      </div>
    </form>
  );
}

function BusinessCalendarCSVImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (rows: Array<BusinessCalendarFormData & { rowNumber: number }>) =>
      bulkImportBusinessCalendarDates(rows),
    onSuccess: (result) => {
      if (!result.success) {
        setErrors([
          result.error || "นำเข้าไม่สำเร็จ",
          ...result.results.errors.slice(0, 10),
        ]);
      } else {
        setErrors([]);
      }

      setSuccessMessage(
        `นำเข้าสำเร็จ: เพิ่ม ${result.results.created} รายการ, อัปเดต ${result.results.updated} รายการ`,
      );
      queryClient.invalidateQueries({ queryKey: ["business-calendar"] });
    },
  });

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrors([]);
    setSuccessMessage(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrors(["รองรับเฉพาะไฟล์ .csv เท่านั้น"]);
      return;
    }

    const maxSizeBytes = SECURITY_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrors([`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${SECURITY_LIMITS.MAX_FILE_SIZE_MB}MB)`]);
      return;
    }

    setSelectedFile(file);
  };

  const parseFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length <= 1) {
      throw new Error("ไฟล์ต้องมี header และข้อมูลอย่างน้อย 1 รายการ");
    }

    const dataLines = lines.slice(1);
    if (dataLines.length > SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD) {
      throw new Error(
        `จำนวนรายการเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD.toLocaleString()} รายการ)`,
      );
    }

    return dataLines.map((line, index) => {
      const rowNumber = index + 2;
      const fields = parseCSVLine(line);

      if (fields.length < 3) {
        throw new Error(`บรรทัด ${rowNumber}: ต้องมีอย่างน้อย 3 คอลัมน์`);
      }

      const type = normalizeCSVType(fields[2] || "");
      if (!type) {
        throw new Error(`บรรทัด ${rowNumber}: ประเภทต้องเป็น HOLIDAY หรือ SPECIAL_WORKDAY`);
      }

      return {
        rowNumber,
        date: normalizeCSVDate(fields[0] || ""),
        name: fields[1]?.trim() || "",
        type,
        scope: fields[3]?.trim() || "GLOBAL",
        note: fields[4]?.trim() || "",
        isActive: (fields[5] || "true").trim().toLowerCase() !== "false",
      };
    });
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setErrors([]);
      setSuccessMessage(null);
      const rows = await parseFile(selectedFile);
      await importMutation.mutateAsync(rows);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ได้"]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setErrors([]);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          นำเข้าจากไฟล์ CSV
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          ใช้สำหรับเพิ่มหรืออัปเดตวันหยุดและวันทำงานพิเศษจำนวนมาก
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        disabled={importMutation.isPending}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />

      {selectedFile && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
            <p className="text-xs text-blue-700">ขนาด: {formatFileSize(selectedFile.size)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {importMutation.isPending ? "กำลังนำเข้า..." : "นำเข้า"}
            </button>
            <button
              onClick={handleClear}
              disabled={importMutation.isPending}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50"
            >
              ล้าง
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <FeedbackBanner
          variant={errors.length > 0 ? "warning" : "success"}
          title={errors.length > 0 ? "นำเข้าบางส่วนสำเร็จ" : "นำเข้าสำเร็จ"}
          message={successMessage}
          className="mt-4"
        />
      )}

      {errors.length > 0 && (
        <FeedbackBanner
          variant="error"
          title="พบข้อผิดพลาด"
          message={
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>• {error}</li>
              ))}
            </ul>
          }
          className="mt-4"
        />
      )}

      <div className="border-t border-gray-200 mt-4 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">รูปแบบไฟล์ CSV</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• date: YYYY-MM-DD หรือ DD/MM/YYYY</p>
          <p>• name: ชื่อวันหยุดหรือวันทำงานพิเศษ</p>
          <p>• type: HOLIDAY หรือ SPECIAL_WORKDAY</p>
          <p>• scope, note, isActive เป็นคอลัมน์เสริม</p>
        </div>
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 font-mono overflow-x-auto">
          date,name,type,scope,note,isActive<br />
          2026-04-13,&quot;วันสงกรานต์&quot;,HOLIDAY,GLOBAL,&quot;&quot;,true<br />
          2026-04-18,&quot;วันทำงานชดเชย&quot;,SPECIAL_WORKDAY,GLOBAL,&quot;&quot;,true
        </div>
      </div>
    </div>
  );
}
