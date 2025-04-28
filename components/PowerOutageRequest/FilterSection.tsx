"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

interface FilterSectionProps {
  statusFilter: string[];
  setStatusFilter: (value: string[]) => void;
  omsStatusFilter: string[];
  setOmsStatusFilter: (value: string[]) => void;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  statusFilter,
  setStatusFilter,
  omsStatusFilter,
  setOmsStatusFilter,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="mb-6 bg-white p-4 md:p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faFilter} className="text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-800">ตัวกรอง</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700"
        >
          <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} />
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              กรองตามสถานะอนุมัติ
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusFilterChange(status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    statusFilter.includes(status.value)
                      ? status.color
                      : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
            {statusFilter.length > 0 && (
              <button
                onClick={() => setStatusFilter([])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              กรองตามสถานะ OMS
            </label>
            <div className="flex flex-wrap gap-2">
              {omsStatusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleOmsStatusFilterChange(status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    omsStatusFilter.includes(status.value)
                      ? status.color
                      : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
            {omsStatusFilter.length > 0 && (
              <button
                onClick={() => setOmsStatusFilter([])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 