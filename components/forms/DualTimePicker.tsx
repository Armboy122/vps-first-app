"use client";
import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";

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
              <label className="block text-sm font-medium text-gray-700">
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-center font-medium text-gray-900 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-center font-medium text-gray-900 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                <p className="text-xs text-gray-500">
                  👆 เลือกชั่วโมงก่อน แล้วเลือกนาที
                </p>
              )}
              {hour && !minute && (
                <p className="text-xs text-blue-600 font-medium">
                  👍 เลือกนาทีให้ครบ
                </p>
              )}
              {hour && minute && (
                <p className="text-xs text-green-600 font-medium">
                  ✅ เวลาที่เลือก: {hour}:{minute} น.
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 text-center">
                  ❌ {error.message}
                </p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};
