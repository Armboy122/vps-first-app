"use client";
import React from "react";
import { FieldError } from "react-hook-form";
import {
  formControlBaseClass,
  formControlDefaultClass,
  formControlErrorClass,
} from "./styles";

interface Option {
  value: string | number;
  label: string;
}

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: FieldError;
  options: Option[];
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { error, options, placeholder = "เลือกตัวเลือก", className = "", id, name, ...props },
    ref,
  ) => {
    return (
      <select
        ref={ref}
        id={id || name}
        name={name}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id || name}-error` : undefined}
        data-invalid={Boolean(error) || undefined}
        className={`${formControlBaseClass} ${
          error ? formControlErrorClass : formControlDefaultClass
        } ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
);

FormSelect.displayName = "FormSelect";
