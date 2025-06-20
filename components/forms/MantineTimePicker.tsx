"use client";
import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import { TimeInput } from "@mantine/dates";

interface MantineTimePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  error?: FieldError;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
  placeholder?: string;
}

export const MantineTimePicker: React.FC<MantineTimePickerProps> = ({
  name,
  control,
  label,
  error,
  disabled = false,
  minTime,
  maxTime,
  placeholder = "เลือกเวลา",
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {

        return (
          <div className="space-y-1">
            <TimeInput
              label={label}
              placeholder={placeholder}
              value={value || ""}
              onChange={(event) => {
                const timeString = event.target.value;
                if (timeString) {
                  // Validate time format and range
                  const [hours, minutes] = timeString.split(':').map(Number);
                  if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    
                    // Check time range
                    if ((minTime && timeValue < minTime) || (maxTime && timeValue > maxTime)) {
                      return; // Don't update if out of range
                    }
                    
                    onChange(timeValue);
                  }
                } else {
                  onChange("");
                }
              }}
              disabled={disabled}
              error={error?.message}
              withSeconds={false}
              size="md"
              styles={{
                input: {
                  fontSize: '16px', // ป้องกัน zoom ใน iOS
                  borderRadius: '8px',
                  transition: 'border-color 0.2s',
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
                <span>⏰ เวลาทำการ: {minTime} - {maxTime} น.</span>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};