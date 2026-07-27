import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "lodash";
import { useAdminContext } from "../../context/AdminContext";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { WorkCenter } from "../../types/admin.types";
import { Search, Trash2 } from "lucide-react";

export function UserSearchBar() {
  const { searchParams, updateSearchParams } = useAdminContext();
  const [searchInput, setSearchInput] = useState(searchParams.search);

  // Fetch work centers for filter
  const { data: workCenters = [], isLoading: workCentersLoading, error: workCentersError } = useQuery({
    queryKey: ["workCenters"],
    queryFn: async () => {
      try {
        const result = await getWorkCenters();
        return result;
      } catch (error) {
        console.error("❌ Error fetching work centers:", {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (failureCount > 0) {
        console.error(`🔄 Retry attempt ${failureCount + 1}/3 for work centers:`, error);
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
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
    <div className="ui-panel mb-6 p-4">
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
              className="ui-input w-full py-2 pl-10 pr-4"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
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
            disabled={workCentersLoading}
            className="ui-input w-full px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">
              {workCentersLoading 
                ? "กำลังโหลด..." 
                : workCentersError 
                  ? "เกิดข้อผิดพลาด" 
                  : "ทุกจุดรวมงาน"
              }
            </option>
            {!workCentersLoading && !workCentersError && workCenters.map((wc: WorkCenter) => (
              <option key={wc.id} value={wc.id.toString()}>
                {wc.name}
              </option>
            ))}
          </select>
          {workCentersError && (
            <p className="text-xs text-red-600 mt-1">
              ไม่สามารถโหลดข้อมูลจุดรวมงานได้
            </p>
          )}
        </div>

        {/* Clear Filters Button */}
        {(searchParams.search || searchParams.workCenterId) && (
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-white px-4 py-2 text-[var(--app-text-body)] transition-colors hover:bg-[var(--app-frame)]"
              title="ล้างตัวกรอง"
            >
              <Trash2 className="h-4 w-4" /> ล้าง
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
