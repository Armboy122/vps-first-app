import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getPowerOutageRequests,
  updateOMS,
  updateStatusRequest,
  deletePowerOutageRequest,
} from "@/app/api/action/powerOutageRequest";
import { OMSStatus, Request } from "@prisma/client";
import { useRequestFilters } from "./useRequestFilters";

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

interface PaginationOptions {
  currentPage: number;
  itemsPerPage: number;
}

export const usePowerOutageRequests = (
  userWorkCenterId?: number,
  isAdmin?: boolean,
  isViewer?: boolean,
) => {
  // Raw data state
  const [rawRequests, setRawRequests] = useState<PowerOutageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use filter sub-hook
  const {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter: updateFilterBase,
    filteredRequests,
  } = useRequestFilters(rawRequests);

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

      setRawRequests(formattedResult);
    } catch (err) {
      console.error("Error loading requests:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [userWorkCenterId, isAdmin, isViewer]);

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

  // Wrap updateFilter to reset pagination on filter change
  const updateFilter = useCallback(
    (key: Parameters<typeof updateFilterBase>[0], value: any) => {
      updateFilterBase(key, value);
      setCurrentPage(1); // Reset to first page when filters change
    },
    [updateFilterBase],
  );

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

  // Load requests on mount
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return {
    // Data
    requests: currentItems,
    allRequests: filteredRequests,
    baseRequests: rawRequests,
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
