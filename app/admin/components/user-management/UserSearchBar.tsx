import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "lodash";
import { useAdminContext } from "../../context/AdminContext";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { WorkCenter } from "../../types/admin.types";

export function UserSearchBar() {
  const { searchParams, updateSearchParams } = useAdminContext();
  const [searchInput, setSearchInput] = useState(searchParams.search);

  // Fetch work centers for filter
  const { data: workCenters = [] } = useQuery({
    queryKey: ["workCenters"],
    queryFn: getWorkCenters,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      updateSearchParams({ search: searchTerm });
    }, 500),
    [updateSearchParams],
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Handle work center filter change
  const handleWorkCenterChange = (workCenterId: string) => {
    updateSearchParams({ 
      workCenterId: workCenterId || undefined,
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    updateSearchParams({ 
      search: "",
      workCenterId: undefined,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหาผู้ใช้
          </label>
          <div className="relative">
            <input
              id="user-search"
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        {/* Work Center Filter */}
        <div className="sm:w-64">
          <label htmlFor="workCenter-filter" className="block text-sm font-medium text-gray-700 mb-1">
            กรองตามจุดรวมงาน
          </label>
          <select
            id="workCenter-filter"
            value={searchParams.workCenterId || ""}
            onChange={(e) => handleWorkCenterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">ทุกจุดรวมงาน</option>
            {workCenters.map((wc: WorkCenter) => (
              <option key={wc.id} value={wc.id.toString()}>
                {wc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchParams.search || searchParams.workCenterId) && (
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="ล้างตัวกรอง"
            >
              🗑️ ล้าง
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(searchParams.search || searchParams.workCenterId) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">ตัวกรองที่ใช้:</span>
            
            {searchParams.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                ค้นหา: {searchParams.search}
              </span>
            )}
            
            {searchParams.workCenterId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                จุดรวมงาน: {workCenters.find(wc => wc.id.toString() === searchParams.workCenterId)?.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}