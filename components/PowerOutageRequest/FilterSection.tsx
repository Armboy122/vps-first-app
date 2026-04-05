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
  { value: "CONFIRM", label: "อนุมัติแล้ว", activeClass: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  { value: "NOT", label: "รอการอนุมัติ", activeClass: "bg-amber-100 text-amber-800 ring-amber-300" },
  { value: "CANCELLED", label: "ยกเลิก", activeClass: "bg-red-100 text-red-800 ring-red-300" },
];

const omsChips = [
  { value: "NOT_ADDED", label: "ยังไม่ดำเนินการ", activeClass: "bg-slate-200 text-slate-800 ring-slate-400" },
  { value: "PROCESSED", label: "ดำเนินการแล้ว", activeClass: "bg-blue-100 text-blue-800 ring-blue-300" },
  { value: "CANCELLED", label: "ยกเลิก OMS", activeClass: "bg-red-100 text-red-800 ring-red-300" },
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
                  className={`px-3 py-1 rounded-full text-xs font-medium ring-1 transition-all cursor-pointer ${
                    isActive
                      ? chip.activeClass
                      : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
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
                  className={`px-3 py-1 rounded-full text-xs font-medium ring-1 transition-all cursor-pointer ${
                    isActive
                      ? chip.activeClass
                      : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
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
          className={`px-3 py-1 rounded-full text-xs font-medium ring-1 transition-all cursor-pointer ${
            showPastOutageDates
              ? "bg-violet-100 text-violet-800 ring-violet-300"
              : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          รายการที่เลยกำหนด
        </button>
      </div>
    );
  },
);

FilterSection.displayName = "FilterSection";
