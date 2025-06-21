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
          console.log("TimePicker raw value:", timeValue);
          
          if (timeValue) {
            // แปลงเวลาให้ตรงกับ validation regex: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            let formattedTime = timeValue;
            
            // ถ้าเป็นรูปแบบ HH:MM:SS ให้ตัดวินาทีออก
            if (timeValue.includes(':') && timeValue.split(':').length > 2) {
              const timeParts = timeValue.split(':');
              formattedTime = `${timeParts[0]}:${timeParts[1]}`;
            }
            
            // แปลงจาก zero-padded เป็น single digit hour ถ้าจำเป็น
            const timeParts = formattedTime.split(':');
            if (timeParts.length === 2) {
              let hour = parseInt(timeParts[0]);
              let minute = timeParts[1];
              
              // ให้ส่งเป็น H:MM format (single digit hour ถ้าเป็น 0-9)
              formattedTime = `${hour}:${minute}`;
            }
            
            console.log("Formatted time for validation:", formattedTime);
            onChange(formattedTime);
          } else {
            onChange(timeValue);
          }
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