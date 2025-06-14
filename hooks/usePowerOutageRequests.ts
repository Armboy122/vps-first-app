import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useDeferredValue,
} from "react";
import {
  getPowerOutageRequests,
  updateOMS,
  updateStatusRequest,
  deletePowerOutageRequest,
} from "@/app/api/action/powerOutageRequest";
import { OMSStatus, Request } from "@prisma/client";
import { PowerOutageRequestService } from "@/lib/services";

// Types
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

interface FilterOptions {
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

interface PaginationOptions {
  currentPage: number;
  itemsPerPage: number;
}

export const usePowerOutageRequests = (
  userWorkCenterId?: number,
  isAdmin?: boolean,
  isViewer?: boolean,
) => {
  // State
  const [requests, setRequests] = useState<PowerOutageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
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

  // Load requests
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Apply workCenter filter for USER role only
      const queryFilters: any = {};
      if (userWorkCenterId && !(isAdmin || isViewer)) {
        queryFilters.workCenterId = userWorkCenterId;
      }

      const result = await getPowerOutageRequests(1, 1000, queryFilters);

      // Handle the new pagination structure
      const dataArray = Array.isArray(result) ? result : result.data;

      const formattedResult = dataArray.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        outageDate: new Date(item.outageDate),
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
        statusUpdatedAt: item.statusUpdatedAt
          ? new Date(item.statusUpdatedAt)
          : null,
      }));

      setRequests(formattedResult);
    } catch (err) {
      console.error("Error loading requests:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [userWorkCenterId, isAdmin, isViewer]);

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

  // Pagination
  const currentItems = useMemo(() => {
    if (filteredRequests.length === 0) {
      return [];
    }

    const maxPage = Math.ceil(filteredRequests.length / itemsPerPage);
    const validCurrentPage = currentPage > maxPage ? maxPage : currentPage;

    const firstItem = (validCurrentPage - 1) * itemsPerPage;
    const lastItem = Math.min(
      firstItem + itemsPerPage,
      filteredRequests.length,
    );

    return filteredRequests.slice(firstItem, lastItem);
  }, [currentPage, filteredRequests, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage)),
    [filteredRequests.length, itemsPerPage],
  );

  // Actions
  const handleUpdateOMS = useCallback(
    async (id: number, status: OMSStatus) => {
      try {
        const result = await updateOMS(id, status);
        if (result.success) {
          await loadRequests();
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error("Error updating OMS status:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ OMS" };
      }
    },
    [loadRequests],
  );

  const handleUpdateStatus = useCallback(
    async (id: number, status: Request) => {
      try {
        const result = await updateStatusRequest(id, status);
        if (result.success) {
          await loadRequests();
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error("Error updating status:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" };
      }
    },
    [loadRequests],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        const result = await deletePowerOutageRequest(id);
        if (result.success) {
          await loadRequests();
          return { success: true };
        } else {
          return { success: false, error: result.message };
        }
      } catch (error) {
        console.error("Error deleting request:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการลบคำขอ" };
      }
    },
    [loadRequests],
  );

  const paginate = useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPage) return;

      const maxPage = Math.ceil(filteredRequests.length / itemsPerPage);
      pageNumber = Math.max(1, Math.min(pageNumber, maxPage || 1));
      setCurrentPage(pageNumber);
    },
    [filteredRequests.length, itemsPerPage, currentPage],
  );

  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const updatePagination = useCallback(
    (options: Partial<PaginationOptions>) => {
      if (options.currentPage !== undefined) {
        setCurrentPage(options.currentPage);
      }
      if (options.itemsPerPage !== undefined) {
        setItemsPerPage(options.itemsPerPage);
        setCurrentPage(1); // Reset to first page when items per page changes
      }
    },
    [],
  );

  // Get row background color using service
  const getRowBackgroundColor = useCallback((request: PowerOutageRequest) => {
    return PowerOutageRequestService.getRowBackgroundColor(
      request.omsStatus,
      request.statusRequest,
      request.outageDate,
    );
  }, []);

  // Load requests on mount
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return {
    // Data
    requests: currentItems,
    allRequests: filteredRequests,
    loading,
    error,

    // Search
    searchTerm,
    setSearchTerm,

    // Filters
    filters,
    updateFilter,

    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    updatePagination,
    paginate,

    // Actions
    loadRequests,
    handleUpdateOMS,
    handleUpdateStatus,
    handleDelete,

    // Utils
    getRowBackgroundColor,

    // Stats
    totalRequests: filteredRequests.length,
    displayRange: {
      start: Math.min(
        (currentPage - 1) * itemsPerPage + 1,
        filteredRequests.length,
      ),
      end: Math.min(currentPage * itemsPerPage, filteredRequests.length),
      total: filteredRequests.length,
    },
  };
};
