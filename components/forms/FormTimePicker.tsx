"use client";

/**
 * FormTimePicker
 *
 * Replaces the previous MUI MobileTimePicker with Mantine's TimeInput
 * from @mantine/dates. This removes MUI from the shared component layer.
 *
 * Interface is unchanged: name, control, label, error, disabled.
 * The field value is always a "HH:mm" string, matching the original contract.
 */

import React from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import { TimeInput } from "@mantine/dates";

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
  disabled = false,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ref } }) => (
        <TimeInput
          ref={ref}
          label={label}
          value={value ?? ""}
          onChange={(event) => onChange(event.currentTarget.value)}
          disabled={disabled}
          error={error?.message}
          withSeconds={false}
        />
      )}
    />
  );
};
