"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCalendarAlt, faBuilding, faTimes } from "@fortawesome/free-solid-svg-icons";

interface WorkCenter {
  id: number;
  name: string;
}

interface SearchSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  workCenterFilter: string;
  setWorkCenterFilter: (value: string) => void;
  workCenters: WorkCenter[];
  isAdmin: boolean;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  searchTerm,
  setSearchTerm,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  workCenterFilter,
  setWorkCenterFilter,
  workCenters,
  isAdmin,
}) => {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  const handleClearSearch = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setWorkCenterFilter("");
  };

  const hasActiveFilters = searchTerm || startDate || endDate || workCenterFilter;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาหมายเลขหม้อแปลง, บริเวณ, หรือผู้สร้างคำขอ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700"
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className="mt-2 flex justify-between items-center">
          <button
            onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isAdvancedSearch ? "ซ่อนตัวกรองขั้นสูง" : "แสดงตัวกรองขั้นสูง"}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={handleClearSearch}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              ล้างการค้นหาทั้งหมด
            </button>
          )}
        </div>
      </div>

      {isAdvancedSearch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-500" />
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-500" />
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          
          {isAdmin && (
            <div>
              <label
                htmlFor="workCenter"
                className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
              >
                <FontAwesomeIcon icon={faBuilding} className="mr-2 text-gray-500" />
                จุดรวมงาน
              </label>
              <select
                id="workCenter"
                value={workCenterFilter}
                onChange={(e) => setWorkCenterFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">ทุกจุดรวมงาน</option>
                {workCenters.map((center) => (
                  <option key={center.id} value={center.id.toString()}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 