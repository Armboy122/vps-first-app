"use client";

import React from "react";

type FeedbackVariant = "success" | "error" | "warning" | "info";

interface FeedbackBannerProps {
  variant: FeedbackVariant;
  title: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  FeedbackVariant,
  { wrapper: string; accent: string; title: string }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    accent: "bg-emerald-500",
    title: "สำเร็จ",
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-900",
    accent: "bg-rose-500",
    title: "เกิดข้อผิดพลาด",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "bg-amber-500",
    title: "คำเตือน",
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-900",
    accent: "bg-sky-500",
    title: "ข้อมูล",
  },
};

export function FeedbackBanner({
  variant,
  title,
  message,
  action,
  className = "",
}: FeedbackBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-xl border px-4 py-3 shadow-sm ${styles.wrapper} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.accent}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title || styles.title}</p>
              <div className="mt-1 text-sm leading-6 text-current/90">
                {message}
              </div>
            </div>
            {action && <div className="shrink-0 sm:ml-4">{action}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
