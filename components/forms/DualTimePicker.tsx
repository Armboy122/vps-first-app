"use client";
import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import {
  formControlBaseClass,
  formControlDefaultClass,
  formControlErrorClass,
  formErrorClass,
  formLabelClass,
} from "./styles";

interface DualTimePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  error?: FieldError;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
}

export const DualTimePicker: React.FC<DualTimePickerProps> = ({
  name,
  control,
  label,
  error,
  disabled = false,
  minTime,
  maxTime,
}) => {
  // สร้างตัวเลือกชั่วโมง (06:00 - 20:00)
  const generateHourOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 20; hour++) {
      const hourString = hour.toString().padStart(2, "0");
      options.push({
        value: hourString,
        label: `${hour} น.`,
      });
    }
    return options;
  };

  // สร้างตัวเลือกนาที (00-59)
  const generateMinuteOptions = () => {
    const options = [];
    for (let minute = 0; minute < 60; minute++) {
      const minuteString = minute.toString().padStart(2, "0");
      options.push({
        value: minuteString,
        label: minute.toString(),
      });
    }
    return options;
  };

  const hourOptions = generateHourOptions();
  const minuteOptions = generateMinuteOptions();

  // แปลง time string เป็น hour และ minute
  const parseTime = (timeString: string): { hour: string; minute: string } => {
    if (!timeString || !timeString.includes(":")) {
      return { hour: "", minute: "" };
    }
    const [hour, minute] = timeString.split(":");
    return { hour, minute };
  };

  // รวม hour และ minute เป็น time string
  const combineTime = (hour: string, minute: string): string => {
    if (!hour || !minute) return "";
    return `${hour}:${minute}`;
  };

  // ตรวจสอบว่าเวลาที่เลือกอยู่ในช่วงที่กำหนดหรือไม่
  const isTimeInRange = (hour: string, minute: string): boolean => {
    if (!hour || !minute) return true;

    const timeString = combineTime(hour, minute);

    if (minTime && timeString <= minTime) return false;
    if (maxTime && timeString > maxTime) return false;

    return true;
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {
        const { hour, minute } = parseTime(value || "");

        const handleHourChange = (newHour: string) => {
          // ถ้าเลือกชั่วโมงใหม่ ให้รีเซ็ตนาทีเป็น "00"
          const newTime = combineTime(newHour, minute || "00");
          onChange(newTime);
        };

        const handleMinuteChange = (newMinute: string) => {
          // ต้องมีชั่วโมงก่อนถึงจะเลือกนาทีได้
          if (!hour) return;
          const newTime = combineTime(hour, newMinute);
          onChange(newTime);
        };

        // กรองตัวเลือกชั่วโมงตาม minTime และ maxTime
        const getFilteredHourOptions = () => {
          return hourOptions.filter((hourOption) => {
            if (!minTime && !maxTime) return true;

            const testTime = combineTime(hourOption.value, "00");
            const testTimeEnd = combineTime(hourOption.value, "59");

            if (minTime && testTimeEnd <= minTime) return false;
            if (maxTime && testTime > maxTime) return false;

            return true;
          });
        };

        // กรองตัวเลือกนาทีตาม hour ที่เลือกและ minTime/maxTime
        const getFilteredMinuteOptions = () => {
          if (!hour) return minuteOptions;

          return minuteOptions.filter((minuteOption) => {
            if (!minTime && !maxTime) return true;

            const testTime = combineTime(hour, minuteOption.value);

            if (minTime && testTime <= minTime) return false;
            if (maxTime && testTime > maxTime) return false;

            return true;
          });
        };

        const filteredHourOptions = getFilteredHourOptions();
        const filteredMinuteOptions = getFilteredMinuteOptions();

        return (
          <div className="space-y-3">
            {label && (
              <label className={formLabelClass}>
                {label}
              </label>
            )}

            {/* Time Selectors */}
            <div className="grid grid-cols-2 gap-4">
              {/* ช่องเลือกชั่วโมง */}
              <div className="space-y-2">
                <select
                  value={hour}
                  onChange={(e) => handleHourChange(e.target.value)}
                  disabled={disabled}
                  className={`${formControlBaseClass} ${formControlDefaultClass} text-center font-medium ${disabled ? "bg-slate-100" : ""}`}
                >
                  <option value="">--</option>
                  {filteredHourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ช่องเลือกนาที */}
              <div className="space-y-2">
                <select
                  value={minute}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  disabled={disabled || !hour}
                  className={`${formControlBaseClass} ${formControlDefaultClass} text-center font-medium ${disabled || !hour ? "bg-slate-100" : ""}`}
                >
                  <option value="">--</option>
                  {filteredMinuteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Helper Text */}
            <div className="text-center">
              {!hour && !minute && (
                <p className={formErrorClass}>
                  <span className="font-semibold">ขั้นตอน</span>
                  เลือกชั่วโมงก่อน แล้วเลือกนาที
                </p>
              )}
              {hour && !minute && (
                <p className="text-xs font-semibold text-pea-700">
                  เลือกนาทีให้ครบ
                </p>
              )}
              {hour && minute && (
                <p className="text-xs font-semibold text-emerald-700">
                  เวลาที่เลือก: {hour}:{minute} น.
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
                <p className="text-center text-sm text-red-700">
                  {error.message}
                </p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};
