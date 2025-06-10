"use client";
import React from 'react';
import { Controller, Control, FieldError } from 'react-hook-form';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import dayjs from 'dayjs';

interface FormTimePickerProps {
  name: string;
  control: Control<any>;
  label: string;
  error?: FieldError;
  disabled?: boolean;
}

export const FormTimePicker: React.FC<FormTimePickerProps> = ({
  name,
  control,
  label,
  error,
  disabled = false
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <MobileTimePicker
          label={label}
          value={value ? dayjs(value, "HH:mm") : null}
          onChange={(newValue: dayjs.Dayjs | null) => {
            onChange(newValue ? newValue.format("HH:mm") : "");
          }}
          ampm={false}
          format="HH:mm"
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
              variant: "outlined",
              error: !!error,
              helperText: error?.message,
              className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500",
            },
          }}
        />
      )}
    />
  );
};
