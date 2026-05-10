"use client";
import React, { useState } from "react";
import { Controller, Control } from "react-hook-form";
import { Badge } from "@mantine/core";
import { Clock, X } from "lucide-react";

interface TimeChipPickerProps {
  name: string;
  control: Control<any>;
  label: string;
  required?: boolean;
  minHour?: number;
  maxHour?: number;
  minTime?: string;
  maxTime?: string;
  error?: { message?: string };
}

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const TimeChipPicker: React.FC<TimeChipPickerProps> = ({
  name,
  control,
  label,
  required = false,
  minHour = 6,
  maxHour = 20,
  minTime,
  maxTime,
  error,
}) => {
  const [selectingMinute, setSelectingMinute] = useState(false);
  const [pendingHour, setPendingHour] = useState<number | null>(null);

  const parseTime = (val: string): { h: number; m: number } | null => {
    if (!val) return null;
    const parts = val.split(":").map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return { h: parts[0], m: parts[1] };
  };

  const minBound = parseTime(minTime || `${minHour}:00`) || { h: minHour, m: 0 };
  const maxBound = parseTime(maxTime || `${maxHour}:00`) || { h: maxHour, m: 0 };
  const minTotal = minBound.h * 60 + minBound.m;
  const maxTotal = maxBound.h * 60 + maxBound.m;

  const hours = Array.from(
    { length: maxBound.h - minBound.h + 1 },
    (_, i) => minBound.h + i,
  ).filter((hour) => {
    const hourStart = hour * 60;
    const hourEnd = hour * 60 + 59;
    return hourEnd >= minTotal && hourStart <= maxTotal;
  });

  const formatTime = (h: number, m: number): string =>
    `${h}:${String(m).padStart(2, "0")}`;

  const formatDisplay = (h: number, m: number): string =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const isAllowedTime = (hour: number, minute: number): boolean => {
    const total = hour * 60 + minute;
    return total >= minTotal && total <= maxTotal;
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {
        const parsed = parseTime(value);

        const handleHourClick = (hour: number) => {
          setPendingHour(hour);
          setSelectingMinute(true);
        };

        const handleMinuteClick = (minute: number) => {
          if (pendingHour !== null) {
            onChange(formatTime(pendingHour, minute));
            setSelectingMinute(false);
            setPendingHour(null);
          }
        };

        const handleClear = () => {
          onChange("");
          setSelectingMinute(false);
          setPendingHour(null);
        };

        return (
          <div className="space-y-2">
            {/* Label + current value */}
            <div className="flex items-center justify-between">
              <label className="block text-[15px] font-semibold text-slate-800">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {parsed && (
                <div className="flex items-center gap-1.5">
                  <Badge
                    color="blue"
                    size="lg"
                    variant="light"
                    radius="md"
                    leftSection={<Clock className="w-3.5 h-3.5" />}
                  >
                    {formatDisplay(parsed.h, parsed.m)}
                  </Badge>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                    title="ล้างเวลา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Hour or Minute chips */}
            {!selectingMinute ? (
              <div>
                <p className="text-sm text-slate-500 mb-2">เลือกชั่วโมง</p>
                <div className="flex flex-wrap gap-1.5">
                  {hours.map((hour) => {
                    const isSelected = parsed?.h === hour && !selectingMinute;
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleHourClick(hour)}
                        className={`min-w-[44px] h-[40px] rounded-lg text-[15px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        {String(hour).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-semibold text-blue-700">
                    {String(pendingHour).padStart(2, "0")}
                  </span>
                  {" "}นาฬิกา — เลือกนาที
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {MINUTES.map((minute) => {
                    const isDisabled =
                      pendingHour === null || !isAllowedTime(pendingHour, minute);
                    const isSelected =
                      parsed?.h === pendingHour && parsed?.m === minute;
                    return (
                      <button
                        key={minute}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleMinuteClick(minute)}
                        className={`h-[40px] rounded-lg text-[15px] font-semibold transition-all cursor-pointer ${
                          isDisabled
                            ? "bg-slate-100 border border-slate-100 text-slate-300 cursor-not-allowed"
                            : isSelected
                              ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        :{String(minute).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectingMinute(false);
                    setPendingHour(null);
                  }}
                  className="mt-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  ← เลือกชั่วโมงใหม่
                </button>
              </div>
            )}

            {/* Error message */}
            {error?.message && (
              <p className="text-[13px] font-medium text-red-700">{error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
};
