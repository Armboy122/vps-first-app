"use client";
import React from 'react';

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: string;
}

const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-700",
  success: "bg-green-500 hover:bg-green-600 text-white",
  danger: "bg-red-500 hover:bg-red-600 text-white"
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg"
};

export const FormButton: React.FC<FormButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = "rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 flex items-center justify-center";
  const disabledClasses = (disabled || isLoading) ? "bg-gray-400 cursor-not-allowed" : variantClasses[variant];
  
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${disabledClasses} ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
          กำลังดำเนินการ...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
