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
    const thClass = "py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap";

    return (
      <thead className="bg-slate-50/80 border-b border-slate-200">
        <tr>
          {!isViewer && (
            <th className={thClass}>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={onToggleSelectAll}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer"
              />
            </th>
          )}
          <th className={thClass}>วันที่ดับไฟ</th>
          <th className={thClass}>เวลา</th>
          {(isAdmin || isViewer) && (
            <>
              <th className={thClass}>จุดรวมงาน</th>
              <th className={thClass}>สาขา</th>
            </>
          )}
          <th className={thClass}>หมายเลขหม้อแปลง</th>
          <th className={thClass}>บริเวณ</th>
          <th className={thClass}>สถานะ OMS</th>
          <th className={thClass}>สถานะอนุมัติ</th>
          <th className={thClass}>ผู้สร้างคำขอ</th>
          {!isViewer && !isSupervisor && (
            <th className={thClass}>การดำเนินการ</th>
          )}
          <th className={thClass}>วันที่สร้าง</th>
        </tr>
      </thead>
    );
  },
);

TableHeader.displayName = "TableHeader";
