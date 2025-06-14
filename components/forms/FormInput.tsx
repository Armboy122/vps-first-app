"use client";
import React from "react";
import { FieldError } from "react-hook-form";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: FieldError;
  icon?: React.ReactNode;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, icon, className = "", ...props }, ref) => {
    const baseClasses =
      "w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-200 focus:outline-none";
    const errorClasses = error
      ? "border-red-300 bg-red-50"
      : "border-gray-300 focus:border-blue-500";

    return (
      <div className="relative">
        <input
          ref={ref}
          {...props}
          className={`${baseClasses} ${errorClasses} ${className}`}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {icon}
          </div>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";
