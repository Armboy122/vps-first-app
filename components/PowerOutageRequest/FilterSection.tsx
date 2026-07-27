"use client";
import React, { useCallback, memo } from "react";

interface FilterSectionProps {
  statusFilter: string[];
  setStatusFilter: (filter: string[]) => void;
  omsStatusFilter: string[];
  setOmsStatusFilter: (filter: string[]) => void;
  showPastOutageDates: boolean;
  setShowPastOutageDates: (show: boolean) => void;
}

const statusChips = [
  { value: "CONFIRM", label: "อนุมัติแล้ว", activeClass: "border-green-300 bg-green-50 text-green-900" },
  { value: "NOT", label: "รอการอนุมัติ", activeClass: "border-amber-300 bg-amber-50 text-amber-950" },
  { value: "CANCELLED", label: "ยกเลิก", activeClass: "border-red-300 bg-red-50 text-red-900" },
];

const omsChips = [
  { value: "NOT_ADDED", label: "ยังไม่ดำเนินการ", activeClass: "border-slate-400 bg-slate-100 text-slate-900" },
  { value: "PROCESSED", label: "ดำเนินการแล้ว", activeClass: "border-green-300 bg-green-50 text-green-900" },
  { value: "CANCELLED", label: "ยกเลิก OMS", activeClass: "border-red-300 bg-red-50 text-red-900" },
];

export const FilterSection = memo(
  ({
    statusFilter,
    setStatusFilter,
    omsStatusFilter,
    setOmsStatusFilter,
    showPastOutageDates,
    setShowPastOutageDates,
  }: FilterSectionProps) => {
    const handleStatusFilterChange = useCallback(
      (status: string) => {
        if (statusFilter.includes(status)) {
          setStatusFilter(statusFilter.filter((s) => s !== status));
        } else {
          setStatusFilter([...statusFilter, status]);
        }
      },
      [statusFilter, setStatusFilter],
    );

    const handleOmsStatusFilterChange = useCallback(
      (status: string) => {
        if (omsStatusFilter.includes(status)) {
          setOmsStatusFilter(omsStatusFilter.filter((s) => s !== status));
        } else {
          setOmsStatusFilter([...omsStatusFilter, status]);
        }
      },
      [omsStatusFilter, setOmsStatusFilter],
    );

    const handlePastOutageDatesChange = useCallback(() => {
      setShowPastOutageDates(!showPastOutageDates);
    }, [showPastOutageDates, setShowPastOutageDates]);

    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* สถานะคำขอ */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">สถานะคำขอ</span>
          <div className="flex gap-1.5 flex-wrap">
            {statusChips.map((chip) => {
              const isActive = statusFilter.includes(chip.value);
              return (
                <button
                  key={chip.value}
                  onClick={() => handleStatusFilterChange(chip.value)}
                  className={`min-h-8 cursor-pointer rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? chip.activeClass
                      : "border-[var(--app-border)] bg-white text-[var(--app-text-muted)] hover:bg-[var(--app-frame)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        {/* สถานะ OMS */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">OMS</span>
          <div className="flex gap-1.5 flex-wrap">
            {omsChips.map((chip) => {
              const isActive = omsStatusFilter.includes(chip.value);
              return (
                <button
                  key={chip.value}
                  onClick={() => handleOmsStatusFilterChange(chip.value)}
                  className={`min-h-8 cursor-pointer rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? chip.activeClass
                      : "border-[var(--app-border)] bg-white text-[var(--app-text-muted)] hover:bg-[var(--app-frame)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        {/* แสดงรายการเก่า */}
        <button
          onClick={handlePastOutageDatesChange}
          className={`min-h-8 cursor-pointer rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
            showPastOutageDates
              ? "border-pea-300 bg-pea-100 text-pea-900"
              : "border-[var(--app-border)] bg-white text-[var(--app-text-muted)] hover:bg-[var(--app-frame)]"
          }`}
        >
          รายการที่เลยกำหนด
        </button>
      </div>
    );
  },
);

FilterSection.displayName = "FilterSection";
