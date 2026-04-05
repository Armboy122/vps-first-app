"use client";

import React from "react";
import { InboxIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  /** Icon rendered above the title. Defaults to InboxIcon. */
  icon?: React.ReactNode;
  /** Primary label */
  title?: string;
  /** Muted description */
  description?: string;
  /** Optional action slot (e.g. a button to create new items) */
  action?: React.ReactNode;
  /** Extra wrapper className */
  className?: string;
}

/**
 * Shared empty state placeholder.
 *
 * Use when a list, table, or search result has zero items.
 * Provides a consistent, centered visual with optional CTA.
 */
export function EmptyState({
  icon,
  title = "ไม่พบข้อมูล",
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center px-4 py-16 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon || <InboxIcon className="h-8 w-8" aria-hidden="true" />}
      </div>
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
