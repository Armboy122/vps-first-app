"use client";

import React from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type FeedbackVariant = "success" | "error" | "warning" | "info";

interface FeedbackBannerProps {
  variant: FeedbackVariant;
  title?: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const variantConfig: Record<
  FeedbackVariant,
  { wrapper: string; icon: React.FC<{ className?: string }>; defaultTitle: string }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircleIcon,
    defaultTitle: "สำเร็จ",
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-900",
    icon: XCircleIcon,
    defaultTitle: "เกิดข้อผิดพลาด",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    icon: ExclamationTriangleIcon,
    defaultTitle: "คำเตือน",
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-900",
    icon: InformationCircleIcon,
    defaultTitle: "ข้อมูล",
  },
};

/**
 * Shared inline feedback banner for success/error/warning/info states.
 *
 * Preferred over ad-hoc alert() or toast for in-page feedback that should
 * remain visible until the user takes action or the state resolves.
 *
 * Accessibility: uses role="alert" for errors (assertive) and role="status"
 * for everything else (polite), with aria-live to announce changes.
 */
export function FeedbackBanner({
  variant,
  title,
  message,
  action,
  className = "",
}: FeedbackBannerProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-xl border px-4 py-3 shadow-sm ${config.wrapper} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{displayTitle}</p>
              <div className="mt-0.5 text-sm leading-6 opacity-90">
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
