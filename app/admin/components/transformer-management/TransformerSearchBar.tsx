import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import { useAdminContext } from "../../context/AdminContext";
import { Search, Trash2 } from "lucide-react";

export function TransformerSearchBar() {
  const { transformerSearchParams, updateTransformerSearchParams } = useAdminContext();
  const [searchInput, setSearchInput] = useState(transformerSearchParams.search);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      updateTransformerSearchParams({ search: searchTerm });
    }, 500),
    [updateTransformerSearchParams],
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput("");
    updateTransformerSearchParams({ search: "" });
  };

  return (
    <div className="ui-panel mb-6 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="transformer-search" className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหาหม้อแปลง
          </label>
          <div className="relative">
            <input
              id="transformer-search"
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหาหมายเลขหม้อแปลง, รายละเอียด GIS..."
              className="ui-input w-full py-2 pl-10 pr-4"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Clear Search Button */}
        {transformerSearchParams.search && (
          <div className="flex items-end">
            <button
              onClick={clearSearch}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-white px-4 py-2 text-[var(--app-text-body)] hover:bg-[var(--app-frame)]"
              title="ล้างการค้นหา"
            >
              <Trash2 className="h-4 w-4" /> ล้าง
            </button>
          </div>
        )}
      </div>

      {/* Active Search Display */}
      {transformerSearchParams.search && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">กำลังค้นหา:</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {transformerSearchParams.search}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
