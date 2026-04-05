"use client";
import React from "react";
import { FieldError } from "react-hook-form";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  formErrorClass,
  formFieldWrapperClass,
  formLabelClass,
} from "./styles";

interface FormFieldProps {
  label: string;
  name: string;
  error?: FieldError;
  required?: boolean;
  icon?: React.ReactNode;
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
    <div className={`${formFieldWrapperClass} ${className}`}>
      <label
        htmlFor={name}
        className={formLabelClass}
      >
        {icon && <span className="mr-2 inline-flex align-middle">{icon}</span>}
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} role="alert" className={formErrorClass}>
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          {error.message}
        </p>
      )}
    </div>
  );
};
