"use client";
import { memo } from "react";

interface TableHeaderProps {
  selectAll: boolean;
  onToggleSelectAll: () => void;
  isAdmin: boolean;
  isViewer: boolean;
  isSupervisor: boolean;
}

export const TableHeader = memo(
  ({
    selectAll,
    onToggleSelectAll,
    isAdmin,
    isViewer,
    isSupervisor,
  }: TableHeaderProps) => {
    const thClass = "px-4 py-3 text-left text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider whitespace-nowrap";

    return (
      <thead className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)]">
        <tr>
          {!isViewer && (
            <th className="py-4 px-4 w-10">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-pea-700 focus:ring-pea-600"
                />
              </div>
            </th>
          )}
          <th className={thClass}>หม้อแปลง / สถานะ</th>
          <th className={thClass}>วัน-เวลาดับไฟ</th>
          {(isAdmin || isViewer) && (
            <th className={thClass}>หน่วยงาน (จุดรวมงาน/สาขา)</th>
          )}
          <th className={thClass}>สถานะอนุมัติ</th>
          <th className={thClass}>สถานะ OMS</th>
          <th className={thClass}>ผู้สร้าง / วันที่สร้าง</th>
          {!isViewer && !isSupervisor && (
            <th className={`${thClass} text-center`}>จัดการ</th>
          )}
        </tr>
      </thead>
    );
  },
);

TableHeader.displayName = "TableHeader";
