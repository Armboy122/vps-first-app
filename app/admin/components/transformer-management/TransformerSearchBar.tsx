import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import { useAdminContext } from "../../context/AdminContext";

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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        {/* Clear Search Button */}
        {transformerSearchParams.search && (
          <div className="flex items-end">
            <button
              onClick={clearSearch}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="ล้างการค้นหา"
            >
              🗑️ ล้าง
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