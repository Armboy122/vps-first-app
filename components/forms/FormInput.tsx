"use client";
import React from "react";
import { FieldError } from "react-hook-form";
import {
  formControlBaseClass,
  formControlDefaultClass,
  formControlErrorClass,
} from "./styles";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: FieldError;
  icon?: React.ReactNode;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, icon, className = "", id, name, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          id={id || name}
          name={name}
          {...props}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id || name}-error` : undefined}
          data-invalid={Boolean(error) || undefined}
          className={`${formControlBaseClass} ${
            error ? formControlErrorClass : formControlDefaultClass
          } ${icon ? "pr-11" : ""} ${className}`}
        />
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {icon}
          </div>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";
