"use client";
import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import { FormSelect } from "./FormSelect";

interface SimpleTimePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  error?: FieldError;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
}

export const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({
  name,
  control,
  label,
  error,
  disabled = false,
  minTime,
  maxTime,
}) => {
  // สร้างตัวเลือกเวลาทุก 1 นาที ตั้งแต่ 06:00 - 20:00
  const generateTimeOptions = () => {
    const options = [];
    const startHour = 6;
    const endHour = 20;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 1) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        // ตรวจสอบ minTime และ maxTime
        if (minTime && timeString <= minTime) continue; // เปลี่ยนจาก < เป็น <= เพื่อไม่ให้เลือกเวลาเดียวกัน
        if (maxTime && timeString > maxTime) continue;

        const displayTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} น.`;

        options.push({
          value: timeString,
          label: displayTime,
        });
      }
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormSelect
          {...field}
          options={timeOptions}
          placeholder="เลือกเวลา"
          error={error}
          disabled={disabled || timeOptions.length === 0}
        />
      )}
    />
  );
};
