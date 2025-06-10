"use client";
import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  name: string;
  error?: FieldError;
  required?: boolean;
  icon?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required = false,
  icon,
  className = "",
  children,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
        {icon && <span className="mr-2">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};
