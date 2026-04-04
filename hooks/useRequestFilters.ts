import { useState, useCallback, useMemo, useDeferredValue } from "react";

interface PowerOutageRequest {
  id: number;
  createdAt: Date;
  createdById: number;
  outageDate: Date;
  startTime: Date;
  endTime: Date;
  workCenterId: number;
  branchId: number;
  transformerNumber: string;
  gisDetails: string;
  area: string | null;
  omsStatus: string;
  statusRequest: string;
  statusUpdatedAt: Date | null;
  statusUpdatedById: number | null;
  createdBy: { fullName: string };
  workCenter: { name: string; id: number };
  branch: { shortName: string };
}

export interface FilterOptions {
  statusFilter: string[];
  omsStatusFilter: string[];
  workCenterFilter: string;
  branchFilter: string;
  startDate: string;
  endDate: string;
  outageStartDate: string;
  outageEndDate: string;
  showPastOutageDates: boolean;
}

export const useRequestFilters = (requests: PowerOutageRequest[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    statusFilter: ["CONFIRM"],
    omsStatusFilter: ["NOT_ADDED"],
    workCenterFilter: "",
    branchFilter: "",
    startDate: "",
    endDate: "",
    outageStartDate: "",
    outageEndDate: "",
    showPastOutageDates: false,
  });

  // Deferred search for better performance
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Filter functions
  const createDateFilter = useCallback((startDate: string, endDate: string) => {
    return (request: PowerOutageRequest) => {
      if (!startDate && !endDate) return true;

      const requestDate = new Date(request.createdAt);
      const start = startDate ? new Date(startDate + "T00:00:00") : null;
      const end = endDate ? new Date(endDate + "T23:59:59") : null;

      if (start && requestDate < start) return false;
      if (end && requestDate > end) return false;
      return true;
    };
  }, []);

  const createOutageDateFilter = useCallback(
    (startDate: string, endDate: string, showPast: boolean) => {
      return (request: PowerOutageRequest) => {
        const outageDate = new Date(request.outageDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter by show past dates
        if (!showPast && outageDate < today) return false;

        // Filter by date range
        if (!startDate && !endDate) return true;

        const start = startDate ? new Date(startDate + "T00:00:00") : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;

        if (start && outageDate < start) return false;
        if (end && outageDate > end) return false;
        return true;
      };
    },
    [],
  );

  const createStatusFilter = useCallback((statusFilters: string[]) => {
    return (request: PowerOutageRequest) => {
      if (statusFilters.length === 0) return true;
      return statusFilters.includes(request.statusRequest);
    };
  }, []);

  const createOMSStatusFilter = useCallback((omsStatusFilters: string[]) => {
    return (request: PowerOutageRequest) => {
      if (omsStatusFilters.length === 0) return true;
      return omsStatusFilters.includes(request.omsStatus);
    };
  }, []);

  const createWorkCenterFilter = useCallback((workCenterFilter: string) => {
    return (request: PowerOutageRequest) => {
      if (!workCenterFilter) return true;
      return request.workCenterId.toString() === workCenterFilter;
    };
  }, []);

  const createBranchFilter = useCallback((branchFilter: string) => {
    return (request: PowerOutageRequest) => {
      if (!branchFilter) return true;
      return request.branchId.toString() === branchFilter;
    };
  }, []);

  // Apply filters
  const filteredByFilters = useMemo(() => {
    const dateFilter = createDateFilter(filters.startDate, filters.endDate);
    const outageFilter = createOutageDateFilter(
      filters.outageStartDate,
      filters.outageEndDate,
      filters.showPastOutageDates,
    );
    const statusFilter = createStatusFilter(filters.statusFilter);
    const omsFilter = createOMSStatusFilter(filters.omsStatusFilter);
    const workCenterFilter = createWorkCenterFilter(filters.workCenterFilter);
    const branchFilter = createBranchFilter(filters.branchFilter);

    return requests.filter(
      (request) =>
        dateFilter(request) &&
        outageFilter(request) &&
        statusFilter(request) &&
        omsFilter(request) &&
        workCenterFilter(request) &&
        branchFilter(request),
    );
  }, [
    requests,
    filters,
    createDateFilter,
    createOutageDateFilter,
    createStatusFilter,
    createOMSStatusFilter,
    createWorkCenterFilter,
    createBranchFilter,
  ]);

  // Apply search filter
  const filteredRequests = useMemo(() => {
    if (!deferredSearchTerm.trim()) {
      return filteredByFilters;
    }

    const lowercaseSearch = deferredSearchTerm.toLowerCase();
    return filteredByFilters.filter((request) => {
      if (request.transformerNumber.toLowerCase().includes(lowercaseSearch))
        return true;
      if (request.area?.toLowerCase().includes(lowercaseSearch)) return true;
      if (request.createdBy.fullName.toLowerCase().includes(lowercaseSearch))
        return true;
      return false;
    });
  }, [filteredByFilters, deferredSearchTerm]);

  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    filteredRequests,
  };
};
