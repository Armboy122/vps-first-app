"use client";
import React from "react";
import {
  formButtonBaseClass,
  formButtonSizeClass,
  formButtonVariantClass,
} from "./styles";

interface FormButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const FormButton: React.FC<FormButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}) => {
  const disabledClasses = disabled || isLoading ? "opacity-60" : "";

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={disabled || isLoading}
      className={`${formButtonBaseClass} ${formButtonVariantClass[variant]} ${formButtonSizeClass[size]} ${disabledClasses} ${className}`}
    >
      {isLoading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          กำลังดำเนินการ...
        </>
      ) : (
        <>
          {icon && <span className="inline-flex">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
