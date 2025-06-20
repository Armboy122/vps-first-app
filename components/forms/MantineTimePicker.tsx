"use client";
import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import { TimePicker } from "@mantine/dates";

interface MantineTimePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  error?: FieldError;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
}

export const MantineTimePicker: React.FC<MantineTimePickerProps> = ({
  name,
  control,
  label,
  error,
  disabled = false,
  minTime,
  maxTime,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {
        const handleTimeChange = (timeValue: string) => {
          // TimePicker จะจัดการ min/max เอง แค่ส่งค่าต่อไป
          onChange(timeValue);
        };

        return (
          <div className="space-y-1">
            <TimePicker
              label={label}
              value={value || ""}
              onChange={handleTimeChange}
              disabled={disabled}
              error={error?.message}
              size="md"
              withSeconds={false}
              withDropdown={true}
              clearable
              hoursStep={1}
              minutesStep={1}
              min={minTime}
              max={maxTime}
              styles={{
                input: {
                  fontSize: '16px', // ป้องกัน zoom ใน iOS
                  borderRadius: '8px',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                },
                label: {
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '4px',
                },
              }}
            />
            
            {/* Helper text */}
            <div className="text-xs text-gray-500">
              {minTime && maxTime && (
                <span>⏰ เวลาที่อนุญาต: {minTime} - {maxTime} น.</span>
              )}
              <div className="mt-1 text-blue-600">
                💡 คลิกที่ช่องเวลาเพื่อเลือกจากดรอปดาวน์ (เวลานอกช่วงจะไม่สามารถเลือกได้)
              </div>
            </div>
          </div>
        );
      }}
    />
  );
};