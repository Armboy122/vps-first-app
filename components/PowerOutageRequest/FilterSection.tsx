"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

interface FilterSectionProps {
  statusFilter: string[];
  setStatusFilter: (filter: string[]) => void;
  omsStatusFilter: string[];
  setOmsStatusFilter: (filter: string[]) => void;
  showPastOutageDates: boolean;
  setShowPastOutageDates: (show: boolean) => void;
}

export function FilterSection({
  statusFilter,
  setStatusFilter,
  omsStatusFilter,
  setOmsStatusFilter,
  showPastOutageDates,
  setShowPastOutageDates
}: FilterSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleStatusFilterChange = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const handleOmsStatusFilterChange = (status: string) => {
    if (omsStatusFilter.includes(status)) {
      setOmsStatusFilter(omsStatusFilter.filter((s) => s !== status));
    } else {
      setOmsStatusFilter([...omsStatusFilter, status]);
    }
  };

  const statusOptions = [
    { value: "CONFIRM", label: "อนุมัติดับไฟ", color: "bg-green-100 text-green-800 border-green-200" },
    { value: "CANCELLED", label: "ยกเลิก", color: "bg-red-100 text-red-800 border-red-200" },
    { value: "NOT", label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ];

  const omsStatusOptions = [
    { value: "NOT_ADDED", label: "ยังไม่ดำเนินการ", color: "bg-gray-100 text-gray-800 border-gray-200" },
    { value: "PROCESSED", label: "ดำเนินการแล้ว", color: "bg-blue-100 text-blue-800 border-blue-200" },
    { value: "CANCELLED", label: "ยกเลิก", color: "bg-red-100 text-red-800 border-red-200" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-md">
      <div>
        <div className="text-gray-700 font-medium mb-2">สถานะคำของานดับไฟ</div>
        <div className="flex gap-2 flex-wrap">
          {["CONFIRM", "NOT", "CANCELLED"].map((status) => (
            <label key={status} className="flex items-center mr-4">
              <input
                type="checkbox"
                className="mr-1 h-4 w-4 text-blue-600"
                checked={statusFilter.includes(status)}
                onChange={() => {
                  if (statusFilter.includes(status)) {
                    setStatusFilter(statusFilter.filter((s) => s !== status));
                  } else {
                    setStatusFilter([...statusFilter, status]);
                  }
                }}
              />
              <span>
                {status === "CONFIRM"
                  ? "อนุมัติแล้ว"
                  : status === "NOT"
                  ? "รอการอนุมัติ"
                  : "ยกเลิก"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="text-gray-700 font-medium mb-2">สถานะการลงข้อมูลในระบบ OMS</div>
        <div className="flex gap-2 flex-wrap">
          {["NOT_ADDED", "PROCESSED", "CANCELLED"].map((status) => (
            <label key={status} className="flex items-center mr-4">
              <input
                type="checkbox"
                className="mr-1 h-4 w-4 text-blue-600"
                checked={omsStatusFilter.includes(status)}
                onChange={() => {
                  if (omsStatusFilter.includes(status)) {
                    setOmsStatusFilter(
                      omsStatusFilter.filter((s) => s !== status)
                    );
                  } else {
                    setOmsStatusFilter([...omsStatusFilter, status]);
                  }
                }}
              />
              <span>
                {status === "NOT_ADDED"
                  ? "ยังไม่ได้เพิ่ม"
                  : status === "PROCESSED"
                  ? "ดำเนินการแล้ว"
                  : "ยกเลิก"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="text-gray-700 font-medium mb-2">การกรองตามวันที่</div>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-1 h-4 w-4 text-blue-600"
            checked={showPastOutageDates}
            onChange={() => setShowPastOutageDates(!showPastOutageDates)}
          />
          <span>แสดงรายการที่เลยวันดับไฟไปแล้ว</span>
        </label>
      </div>
    </div>
  );
} 