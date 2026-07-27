"use client";
import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Search, Calendar, Building2, X, Info, GitBranch, SlidersHorizontal } from "lucide-react";
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

export const SearchSection = memo(
  ({
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
    const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
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
          // ใช้ setTimeout เพื่อหลีกเลี่ยง infinite loop
          if (branchFilter) {
            setTimeout(() => setBranchFilter(""), 0);
          }
        }
      };

      loadBranches();
    }, [workCenterFilter, branchFilter, setBranchFilter]);

    const handleClearSearch = useCallback(() => {
      setSearchTerm("");
      setStartDate("");
      setEndDate("");

      setWorkCenterFilter("");
      setBranchFilter("");
    }, [
      setSearchTerm,
      setStartDate,
      setEndDate,
      setWorkCenterFilter,
      setBranchFilter,
    ]);

    const handleSearchTermChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
      },
      [setSearchTerm],
    );

    const handleStartDateChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setStartDate(e.target.value);
      },
      [setStartDate],
    );

    const handleEndDateChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEndDate(e.target.value);
      },
      [setEndDate],
    );

    const handleWorkCenterChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        setWorkCenterFilter(e.target.value);
      },
      [setWorkCenterFilter],
    );

    const handleBranchChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        setBranchFilter(e.target.value);
      },
      [setBranchFilter],
    );

    const toggleAdvancedSearch = useCallback(() => {
      setIsAdvancedSearch(!isAdvancedSearch);
    }, [isAdvancedSearch]);

    const toggleSearchInfo = useCallback(() => {
      setSearchInfoOpen(!searchInfoOpen);
    }, [searchInfoOpen]);

    const clearSearchTerm = useCallback(() => {
      setSearchTerm("");
    }, [setSearchTerm]);

    const hasActiveFilters = useMemo(
      () =>
        Boolean(
          searchTerm ||
            startDate ||
            endDate ||
            workCenterFilter ||
            branchFilter,
        ),
      [searchTerm, startDate, endDate, workCenterFilter, branchFilter],
    );

    const workCenterOptions = useMemo(
      () =>
        workCenters.map((center) => (
          <option key={center.id} value={center.id.toString()}>
            {center.name}
          </option>
        )),
      [workCenters],
    );

    const branchOptions = useMemo(
      () =>
        branches.map((branch) => (
          <option key={branch.id} value={branch.id.toString()}>
            {branch.shortName}
          </option>
        )),
      [branches],
    );

    return (
      <div className="space-y-4">
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาหมายเลขหม้อแปลง, บริเวณ, หรือผู้สร้างคำขอ..."
              value={searchTerm}
              onChange={handleSearchTermChange}
              className="ui-input w-full py-2.5 pl-10 pr-10 text-sm placeholder:text-slate-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            {searchTerm && (
              <button
                onClick={clearSearchTerm}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAdvancedSearch}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-[var(--app-text-body)] transition-colors hover:text-pea-800"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {isAdvancedSearch ? "ซ่อนตัวกรองขั้นสูง" : "แสดงตัวกรองขั้นสูง"}
              </button>

              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-frame)]"
                onClick={toggleSearchInfo}
                aria-label="คำแนะนำการค้นหา"
              >
                <Info className="w-4 h-4" />
              </button>

              {searchInfoOpen && (
                <div className="absolute top-full z-10 mt-2 w-72 rounded-lg border border-[var(--app-border)] bg-white p-3 text-sm shadow-[var(--app-shadow-raised)]">
                  <h4 className="font-bold mb-2">คำแนะนำการค้นหา:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ค้นหาหมายเลขหม้อแปลง เช่น 08-123456</li>
                    <li>ค้นหาตามบริเวณ เช่น หมู่บ้าน, ถนน</li>
                    <li>ค้นหาตามชื่อผู้สร้างคำขอ</li>
                  </ul>
                  <div className="mt-2 text-right">
                    <button
                      onClick={toggleSearchInfo}
                      className="text-xs font-semibold text-pea-700 hover:text-pea-900"
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
                className="min-h-10 rounded-md px-2 text-sm font-medium text-[var(--app-danger)] hover:bg-red-50"
              >
                ล้างการค้นหาทั้งหมด
              </button>
            )}
          </div>
        </div>

        {isAdvancedSearch && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
            <div>
              <label
                htmlFor="startDate"
                className="text-sm font-medium text-slate-600 mb-1 flex items-center"
              >
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={handleStartDateChange}
                className="ui-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="text-sm font-medium text-slate-600 mb-1 flex items-center"
              >
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={handleEndDateChange}
                className="ui-input w-full px-3 py-2 text-sm"
              />
            </div>

            {(isAdmin || isViewer) && (
              <>
                <div>
                  <label
                    htmlFor="workCenter"
                    className="text-sm font-medium text-slate-600 mb-1 flex items-center"
                  >
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    จุดรวมงาน
                  </label>
                  <select
                    id="workCenter"
                    value={workCenterFilter}
                    onChange={handleWorkCenterChange}
                    className="ui-input w-full px-3 py-2 text-sm"
                  >
                    <option value="">ทุกจุดรวมงาน</option>
                    {workCenterOptions}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="branch"
                    className="text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <GitBranch className="w-4 h-4 mr-2 text-slate-400" />
                    สาขา
                  </label>
                  <select
                    id="branch"
                    value={branchFilter}
                    onChange={handleBranchChange}
                    disabled={!workCenterFilter}
                    className={`ui-input w-full px-3 py-2 text-sm ${!workCenterFilter ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
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
  },
);

SearchSection.displayName = "SearchSection";
