"use client";
import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCalendarAlt, faBuilding, faTimes, faInfoCircle, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
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
  isViewer: boolean;
  branchFilter: string;
  setBranchFilter: (value: string) => void;
}

export const SearchSection = memo(({
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
  isViewer,
  branchFilter,
  setBranchFilter,
}: SearchSectionProps) => {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(isAdmin || isViewer);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchInfoOpen, setSearchInfoOpen] = useState(false);

  useEffect(() => {
    const loadBranches = async () => {
      if (workCenterFilter) {
        try {
          const branchData = await getBranches(Number(workCenterFilter));
          setBranches(branchData);
        } catch (error) {
          console.error("ไม่สามารถโหลดข้อมูลสาขาได้:", error);
        }
      } else {
        setBranches([]);
        setBranchFilter("");
      }
    };

    loadBranches();
  }, [workCenterFilter, setBranchFilter]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    
    const hasWorkCenterOrBranchFilter = workCenterFilter !== "" || branchFilter !== "";
    
    setWorkCenterFilter("");
    setBranchFilter("");
  }, [
    setSearchTerm, 
    setStartDate, 
    setEndDate, 
    setWorkCenterFilter, 
    setBranchFilter,
    workCenterFilter,
    branchFilter
  ]);

  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, [setStartDate]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, [setEndDate]);

  const handleWorkCenterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setWorkCenterFilter(e.target.value);
  }, [setWorkCenterFilter]);

  const handleBranchChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setBranchFilter(e.target.value);
  }, [setBranchFilter]);

  const toggleAdvancedSearch = useCallback(() => {
    setIsAdvancedSearch(!isAdvancedSearch);
  }, [isAdvancedSearch]);

  const toggleSearchInfo = useCallback(() => {
    setSearchInfoOpen(!searchInfoOpen);
  }, [searchInfoOpen]);

  const clearSearchTerm = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  const hasActiveFilters = useMemo(() => 
    Boolean(searchTerm || startDate || endDate || workCenterFilter || branchFilter),
  [searchTerm, startDate, endDate, workCenterFilter, branchFilter]);

  const workCenterOptions = useMemo(() => 
    workCenters.map((center) => (
      <option key={center.id} value={center.id.toString()}>
        {center.name}
      </option>
    )),
  [workCenters]);

  const branchOptions = useMemo(() => 
    branches.map((branch) => (
      <option key={branch.id} value={branch.id.toString()}>
        {branch.shortName}
      </option>
    )),
  [branches]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาหมายเลขหม้อแปลง, บริเวณ, หรือผู้สร้างคำขอ..."
            value={searchTerm}
            onChange={handleSearchTermChange}
            className="w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700"
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={clearSearchTerm}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className="mt-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAdvancedSearch}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {isAdvancedSearch ? "ซ่อนตัวกรองขั้นสูง" : "แสดงตัวกรองขั้นสูง"}
            </button>
            
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleSearchInfo}
              aria-label="คำแนะนำการค้นหา"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
            </button>
            
            {searchInfoOpen && (
              <div className="absolute z-10 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 text-sm w-72 top-full">
                <h4 className="font-bold mb-2">คำแนะนำการค้นหา:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>ค้นหาหมายเลขหม้อแปลง เช่น 08-123456</li>
                  <li>ค้นหาตามบริเวณ เช่น หมู่บ้าน, ถนน</li>
                  <li>ค้นหาตามชื่อผู้สร้างคำขอ</li>
                </ul>
                <div className="mt-2 text-right">
                  <button 
                    onClick={toggleSearchInfo}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
          
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-200">
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
              onChange={handleStartDateChange}
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
              onChange={handleEndDateChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          
          {(isAdmin || isViewer) && (
            <>
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
                  onChange={handleWorkCenterChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="">ทุกจุดรวมงาน</option>
                  {workCenterOptions}
                </select>
              </div>
              
              <div>
                <label
                  htmlFor="branch"
                  className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
                >
                  <FontAwesomeIcon icon={faCodeBranch} className="mr-2 text-gray-500" />
                  สาขา
                </label>
                <select
                  id="branch"
                  value={branchFilter}
                  onChange={handleBranchChange}
                  disabled={!workCenterFilter}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${!workCenterFilter ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">ทุกสาขา</option>
                  {branchOptions}
                </select>
                {!workCenterFilter && (
                  <p className="text-xs text-gray-500 mt-1">
                    กรุณาเลือกจุดรวมงานก่อน
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

SearchSection.displayName = 'SearchSection'; 