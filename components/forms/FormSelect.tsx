"use client";
import React from 'react';
import { FieldError } from 'react-hook-form';

interface Option {
  value: string | number;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: FieldError;
  options: Option[];
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(({
  error,
  options,
  placeholder = "เลือกตัวเลือก",
  className = '',
  ...props
}, ref) => {
  const baseClasses = "w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-200 focus:outline-none";
  const errorClasses = error ? "border-red-300 bg-red-50" : "border-gray-300 focus:border-blue-500";
  
  return (
    <select
      ref={ref}
      {...props}
      className={`${baseClasses} ${errorClasses} ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

FormSelect.displayName = 'FormSelect';
