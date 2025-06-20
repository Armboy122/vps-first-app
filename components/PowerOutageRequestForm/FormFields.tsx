"use client";
import React from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  Controller,
} from "react-hook-form";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  FormField,
  FormInput,
  FormSelect,
  DualTimePicker,
} from "@/components/forms";
import dayjs from "dayjs";

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

interface FormFieldsProps {
  register: UseFormRegister<PowerOutageRequestInput>;
  control: Control<PowerOutageRequestInput>;
  errors: FieldErrors<PowerOutageRequestInput>;
  role: string;
  workCenters?: WorkCenter[];
  branches: Branch[];
  transformers: Transformer[];
  watchWorkCenterId: string;
  minSelectableDate: string;
  watchedOutageDate: string;
  daysFromToday: number | null;
  timeError: string | null;
  branchesLoading?: boolean;
  watchedStartTime?: string;
  watchedEndTime?: string;
  onDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTransformerSearch: (searchTerm: string) => void;
  onTransformerSelect: (transformer: Transformer) => void;
}

export const FormFields: React.FC<FormFieldsProps> = ({
  register,
  control,
  errors,
  role,
  workCenters,
  branches,
  transformers,
  watchWorkCenterId,
  minSelectableDate,
  watchedOutageDate,
  daysFromToday,
  timeError,
  branchesLoading,
  watchedStartTime,
  watchedEndTime,
  onDateChange,
  onTransformerSearch,
  onTransformerSelect,
}) => {
  const workCenterOptions =
    workCenters?.map((wc) => ({ value: wc.id, label: wc.name })) || [];
  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.shortName,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* วันที่ดับไฟ */}
      <FormField
        label="วันที่ดับไฟ"
        name="outageDate"
        error={errors.outageDate}
        required
        icon="📅"
      >
        <FormInput
          type="date"
          min={minSelectableDate}
          {...register("outageDate")}
          onChange={onDateChange}
          error={
            errors.outageDate ||
            (timeError ? ({ message: timeError } as any) : undefined)
          }
        />

        {/* แสดงข้อมูลเสริมเกี่ยวกับวันที่ */}
        <div className="mt-1 space-y-1">
          <p className="text-xs text-gray-500">
            วันที่เร็วที่สุดที่สามารถเลือกได้:
            <span className="font-medium text-green-600">
              {dayjs(minSelectableDate).format("DD/MM/YYYY")}
            </span>
          </p>

          {watchedOutageDate && (
            <p
              className={`text-xs font-medium ${
                daysFromToday !== null && daysFromToday > 10
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {daysFromToday !== null && (
                <>
                  {daysFromToday > 10
                    ? `✅ วันที่เลือก: ${dayjs(watchedOutageDate).format("DD/MM/YYYY")} (${daysFromToday} วันจากวันนี้)`
                    : `❌ วันที่เลือกไม่ถูกต้อง: ${dayjs(watchedOutageDate).format("DD/MM/YYYY")} (เหลือเพียง ${daysFromToday} วัน)`}
                </>
              )}
            </p>
          )}
        </div>
      </FormField>

      {/* เวลาเริ่มต้น */}
      <FormField
        label="เวลาเริ่มต้น"
        name="startTime"
        error={errors.startTime}
        required
        icon="🕐"
      >
        <DualTimePicker
          name="startTime"
          control={control}
          error={errors.startTime}
          minTime="06:00"
          maxTime="19:30"
        />
        <p className="text-xs text-gray-500 mt-1">
          ⏰ เวลาทำการ: 06:00 - 19:30 น.
        </p>
      </FormField>

      {/* เวลาสิ้นสุด */}
      <FormField
        label="เวลาสิ้นสุด"
        name="endTime"
        error={errors.endTime}
        required
        icon="🕐"
      >
        <DualTimePicker
          name="endTime"
          control={control}
          error={errors.endTime}
          minTime={watchedStartTime || "06:30"}
          maxTime="20:00"
        />
        {watchedStartTime &&
          watchedEndTime &&
          watchedEndTime <= watchedStartTime && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น
            </p>
          )}
        <p className="text-xs text-gray-500 mt-1">
          ⏰ ต้องมากกว่าเวลาเริ่มต้นอย่างน้อย 30 นาที
        </p>
      </FormField>

      {/* จุดรวมงาน (สำหรับ Admin เท่านั้น) */}
      {role === "ADMIN" && (
        <FormField
          label="จุดรวมงาน"
          name="workCenterId"
          error={errors.workCenterId}
          required
          icon="🏢"
        >
          <Controller
            name="workCenterId"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={workCenterOptions}
                placeholder="เลือกจุดรวมงาน"
                error={errors.workCenterId}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </FormField>
      )}

      {/* สาขา (สำหรับ Admin เท่านั้น) */}
      {role === "ADMIN" && (
        <FormField
          label="สาขา"
          name="branchId"
          error={errors.branchId}
          required
          icon="🏪"
        >
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={branchOptions}
                placeholder={
                  !watchWorkCenterId
                    ? "กรุณาเลือกจุดรวมงานก่อน"
                    : branchesLoading
                      ? "กำลังโหลดสาขา..."
                      : "เลือกสาขา"
                }
                error={errors.branchId}
                disabled={!watchWorkCenterId || branchesLoading}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </FormField>
      )}

      {/* หมายเลขหม้อแปลง */}
      <FormField
        label="หมายเลขหม้อแปลง"
        name="transformerNumber"
        error={errors.transformerNumber}
        required
        icon="⚡"
      >
        <FormInput
          {...register("transformerNumber", {
            onChange: (e) => onTransformerSearch(e.target.value),
          })}
          placeholder="ค้นหาหมายเลขหม้อแปลง"
          error={errors.transformerNumber}
        />

        {/* รายการหม้อแปลงที่ค้นหาได้ */}
        {transformers.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-md shadow-sm">
            {transformers.map((transformer) => (
              <li
                key={transformer.transformerNumber}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => onTransformerSelect(transformer)}
              >
                {transformer.transformerNumber} - {transformer.gisDetails}
              </li>
            ))}
          </ul>
        )}
      </FormField>

      {/* สถานที่ติดตั้ง (GIS) */}
      <FormField label="สถานที่ติดตั้ง (GIS)" name="gisDetails" icon="📍">
        <FormInput
          {...register("gisDetails")}
          readOnly
          className="bg-gray-50"
        />
      </FormField>

      {/* พื้นที่ไฟดับ */}
      <FormField label="พื้นที่ไฟดับ" name="area" error={errors.area} icon="🌍">
        <FormInput
          {...register("area")}
          placeholder="ระบุพื้นที่ไฟดับ"
          error={errors.area}
        />
      </FormField>
    </div>
  );
};
