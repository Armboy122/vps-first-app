"use client";
import { useState, useCallback, useEffect } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { updatePowerOutageRequest } from "@/app/api/action/powerOutageRequest";
import UpdatePowerOutageRequestModal from "./UpdateRequesr";
import { ConfirmDialog, LoadingSpinner } from "@/components/ui";
import { useAuth } from "@/lib/useAuth";
import { OMSStatus, Request } from "@prisma/client";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { useLogger } from "@/hooks/useLogger";
import {
  logUserAction,
  logFormInteraction,
  logError,
} from "@/lib/utils/logger";

// Import custom hooks
import { usePowerOutageRequests } from "@/hooks/usePowerOutageRequests";
import { useRequestSelection } from "@/hooks/useRequestSelection";
import { useIsMobile } from "@/hooks/useIsMobile";

// Import components from PowerOutageRequest folder
import { TableHeader } from "./PowerOutageRequest/TableHeader";
import { TableRow } from "./PowerOutageRequest/TableRow";
import { MobileCard } from "./PowerOutageRequest/MobileCard";
import { ActionFeedbackState } from "./PowerOutageRequest/ActionFeedback";
import { FilterSection } from "./PowerOutageRequest/FilterSection";
import { SearchSection } from "./PowerOutageRequest/SearchSection";
import { BulkActions } from "./PowerOutageRequest/BulkActions";
import { OMSStatusSummary } from "./PowerOutageRequest/OMSStatusSummary";
import { PaginationControls } from "./PowerOutageRequest/PaginationControls";
import { printSelectedRequests } from "./PowerOutageRequest/PrintService";

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

interface WorkCenter {
  id: number;
  name: string;
}

type ConfirmAction =
  | {
      type: "delete";
      requestId: number;
      transformerNumber?: string;
      title: string;
      message: string;
      confirmLabel: string;
      isDestructive: boolean;
    }
  | {
      type: "bulk-status";
      requestIds: number[];
      newStatus: Request;
      title: string;
      message: string;
      confirmLabel: string;
      isDestructive: boolean;
    };

const REQUEST_STATUS_LABELS: Record<Request, string> = {
  NOT: "รออนุมัติ",
  CONFIRM: "อนุมัติดับไฟ",
  CANCELLED: "ยกเลิก",
};

// Empty state components
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
    <svg
      className="w-16 h-16 mb-4 text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
    <p className="text-lg font-medium">{message}</p>
  </div>
);

const NoSearchResults = ({ searchTerm }: { searchTerm: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
    <svg
      className="w-16 h-16 mb-4 text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <p className="text-lg font-medium">ไม่พบผลลัพธ์สำหรับ &ldquo;{searchTerm}&rdquo;</p>
    <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น หรือล้างตัวกรองออก</p>
  </div>
);

export default function PowerOutageRequestList() {
  // Authentication & Logging
  const {
    isAdmin,
    isUser,
    isViewer,
    isManager,
    isSupervisor,
    userWorkCenterId,
    isLoading: authLoading,
  } = useAuth();

  useLogger(); // Auto-setup logging for this component

  // Data & filter hook
  const {
    requests,
    allRequests,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    currentPage,
    totalPages,
    itemsPerPage,
    updatePagination,
    paginate,
    handleUpdateOMS,
    handleUpdateStatus,
    handleDelete,
    loadRequests,
    displayRange,
  } = usePowerOutageRequests(userWorkCenterId, isAdmin, isViewer);

  // Selection hook
  const {
    selectedRequests,
    selectAll,
    handleSelectAll,
    handleSelectRequest,
    clearSelection,
  } = useRequestSelection(requests);

  // Mobile detection hook
  const isMobile = useIsMobile();

  // Local state
  const [editingRequest, setEditingRequest] =
    useState<PowerOutageRequest | null>(null);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [actionFeedback, setActionFeedback] =
    useState<ActionFeedbackState | null>(null);

  // Fetch work centers on mount
  const fetchWorkCenters = useCallback(async () => {
    try {
      const centers = await getWorkCenters();
      setWorkCenters(centers);
    } catch (err) {
      console.error("ไม่สามารถดึงข้อมูลจุดรวมงานได้:", err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchWorkCenters();
    }
  }, [authLoading, fetchWorkCenters]);

  useEffect(() => {
    if (!actionFeedback || actionFeedback.variant === "error") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionFeedback(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

  // UI handlers
  const handleEdit = (request: PowerOutageRequest) => {
    logUserAction("power_outage_request_edit_clicked", {
      requestId: request.id,
      transformerNumber: request.transformerNumber,
      outageDate: request.outageDate,
      currentStatus: request.statusRequest,
      omsStatus: request.omsStatus,
    });
    setEditingRequest(request);
  };

  const handleUpdate = async (data: PowerOutageRequestInput) => {
    if (!editingRequest) {
      logError(
        "power_outage_request_update_failed",
        "No request is currently being edited",
      );
      return;
    }

    logFormInteraction("power_outage_request_update_started", {
      requestId: editingRequest.id,
      changes: data,
    });

    try {
      const result = await updatePowerOutageRequest(editingRequest.id, data);
      if (result.success) {
        logUserAction("power_outage_request_updated", {
          requestId: editingRequest.id,
          updatedData: data,
          success: true,
        });
        setEditingRequest(null);
        await loadRequests();
      } else {
        logError(
          "power_outage_request_update_failed",
          result.error || "Unknown error",
          {
            requestId: editingRequest.id,
            data,
          },
        );
        console.error("เกิดข้อผิดพลาดในการอัปเดตคำขอดับไฟ:", result.error);
      }
    } catch (error) {
      logError("power_outage_request_update_error", error as Error, {
        requestId: editingRequest.id,
        data,
      });
      console.error("Error updating power outage request:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingRequest(null);
  };

  const closeConfirmDialog = useCallback(() => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "delete") {
      logUserAction("power_outage_request_delete_cancelled", {
        requestId: confirmAction.requestId,
      });
    }

    if (confirmAction.type === "bulk-status") {
      logUserAction("bulk_status_change_cancelled", {
        newStatus: confirmAction.newStatus,
        selectedCount: confirmAction.requestIds.length,
        requestIds: confirmAction.requestIds,
      });
    }

    setConfirmAction(null);
  }, [confirmAction]);

  // Delete handler
  const handleDeleteConfirm = (id: number) => {
    const request = requests.find((r) => r.id === id);

    logUserAction("power_outage_request_delete_confirm_shown", {
      requestId: id,
      transformerNumber: request?.transformerNumber,
    });

    setConfirmAction({
      type: "delete",
      requestId: id,
      transformerNumber: request?.transformerNumber,
      title: "ลบคำขอดับไฟ",
      message: request?.transformerNumber
        ? `คุณต้องการลบคำขอของหม้อแปลง ${request.transformerNumber} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
        : "คุณต้องการลบคำขอนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
      confirmLabel: "ลบรายการ",
      isDestructive: true,
    });
  };

  // Bulk operations
  const handleBulkStatusChange = (newStatus: Request) => {
    if (!newStatus || selectedRequests.length === 0) {
      return;
    }

    logUserAction("bulk_status_change_confirm_shown", {
      newStatus,
      selectedCount: selectedRequests.length,
      requestIds: selectedRequests,
    });

    setConfirmAction({
      type: "bulk-status",
      requestIds: [...selectedRequests],
      newStatus,
      title: "เปลี่ยนสถานะคำขอที่เลือก",
      message: `ยืนยันการเปลี่ยนสถานะ ${selectedRequests.length} รายการเป็น “${REQUEST_STATUS_LABELS[newStatus]}”`,
      confirmLabel: "ยืนยันการเปลี่ยนสถานะ",
      isDestructive: newStatus === "CANCELLED",
    });
  };

  const handlePrintSelected = useCallback(async () => {
    const feedback = await printSelectedRequests(selectedRequests, allRequests);
    setActionFeedback(feedback);
  }, [allRequests, selectedRequests]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "delete") {
      logUserAction("power_outage_request_delete_confirmed", {
        requestId: confirmAction.requestId,
        transformerNumber: confirmAction.transformerNumber,
      });

      const result = await handleDelete(confirmAction.requestId);
      if (!result.success) {
        logError(
          "power_outage_request_delete_failed",
          result.error || "Unknown error",
          {
            requestId: confirmAction.requestId,
            transformerNumber: confirmAction.transformerNumber,
          },
        );
        console.error("เกิดข้อผิดพลาดในการลบคำขอ:", result.error);
        return;
      }

      setConfirmAction(null);
      return;
    }

    logUserAction("bulk_status_change_confirmed", {
      newStatus: confirmAction.newStatus,
      selectedCount: confirmAction.requestIds.length,
      requestIds: confirmAction.requestIds,
    });

    try {
      for (const id of confirmAction.requestIds) {
        const result = await handleUpdateStatus(id, confirmAction.newStatus);
        if (!result.success) {
          throw new Error(result.error || "Unknown error");
        }
      }

      logUserAction("bulk_status_change_completed", {
        newStatus: confirmAction.newStatus,
        processedCount: confirmAction.requestIds.length,
        success: true,
      });

      clearSelection();
      setActionFeedback({
        variant: "success",
        title: "อัปเดตสถานะรายการเรียบร้อย",
        message: `เปลี่ยนสถานะ ${confirmAction.requestIds.length} รายการเป็น “${REQUEST_STATUS_LABELS[confirmAction.newStatus]}” แล้ว`,
      });
      setConfirmAction(null);
    } catch (error) {
      logError("bulk_status_change_failed", error as Error, {
        newStatus: confirmAction.newStatus,
        selectedCount: confirmAction.requestIds.length,
        requestIds: confirmAction.requestIds,
      });
      console.error("Error updating multiple requests:", error);
      setActionFeedback({
        variant: "error",
        title: "ไม่สามารถอัปเดตสถานะพร้อมกันได้",
        message: "บางรายการอาจยังไม่ถูกอัปเดต กรุณาตรวจสอบและลองใหม่อีกครั้ง",
      });
    }
  }, [clearSelection, confirmAction, handleDelete, handleUpdateStatus]);

  // Status update handlers
  const handleEditOmsStatus = async (id: number, newStatus: OMSStatus) => {
    const request = requests.find((r) => r.id === id);

    logUserAction("oms_status_change_started", {
      requestId: id,
      transformerNumber: request?.transformerNumber,
      oldStatus: request?.omsStatus,
      newStatus,
    });

    const result = await handleUpdateOMS(id, newStatus);
    if (result.success) {
      logUserAction("oms_status_updated", {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.omsStatus,
        newStatus,
        success: true,
      });
    } else {
      logError("oms_status_update_failed", result.error || "Unknown error", {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.omsStatus,
        newStatus,
      });
      console.error(`Failed to update OMS Status: ${result.error}`);
    }
  };

  const handleEditStatusRequest = async (id: number, newStatus: Request) => {
    const request = requests.find((r) => r.id === id);

    logUserAction("request_status_change_started", {
      requestId: id,
      transformerNumber: request?.transformerNumber,
      oldStatus: request?.statusRequest,
      newStatus,
    });

    const result = await handleUpdateStatus(id, newStatus);
    if (result.success) {
      logUserAction("request_status_updated", {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.statusRequest,
        newStatus,
        success: true,
      });
    } else {
      logError(
        "request_status_update_failed",
        result.error || "Unknown error",
        {
          requestId: id,
          transformerNumber: request?.transformerNumber,
          oldStatus: request?.statusRequest,
          newStatus,
        },
      );
      console.error(`Failed to update Status Request: ${result.error}`);
    }
  };

  // Early returns for loading/error states
  if (authLoading)
    return (
      <LoadingSpinner minHeight={256} />
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg
          className="w-16 h-16 mb-4 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-red-500 text-lg font-medium">{error}</p>
        <button
          onClick={loadRequests}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Search Section */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
        <SearchSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          startDate={filters.startDate}
          setStartDate={(value) => updateFilter("startDate", value)}
          endDate={filters.endDate}
          setEndDate={(value) => updateFilter("endDate", value)}
          workCenterFilter={filters.workCenterFilter}
          setWorkCenterFilter={(value) =>
            updateFilter("workCenterFilter", value)
          }
          workCenters={workCenters}
          isAdmin={isAdmin}
          isViewer={isViewer}
          branchFilter={filters.branchFilter}
          setBranchFilter={(value) => updateFilter("branchFilter", value)}
        />
      </div>

      {/* Filter Section */}
      <FilterSection
        statusFilter={filters.statusFilter}
        setStatusFilter={(value) => updateFilter("statusFilter", value)}
        omsStatusFilter={filters.omsStatusFilter}
        setOmsStatusFilter={(value) => updateFilter("omsStatusFilter", value)}
        showPastOutageDates={filters.showPastOutageDates}
        setShowPastOutageDates={(value) =>
          updateFilter("showPastOutageDates", value)
        }
      />

      {/* OMS Status Summary - admin and viewer only */}
      {(isAdmin || isViewer) && (
        <OMSStatusSummary
          requests={allRequests}
          filteredRequests={allRequests}
          showFilteredSummary={true}
        />
      )}

      {/* Bulk Actions Section */}
      <BulkActions
        isUser={isUser}
        isAdmin={isAdmin}
        isViewer={isViewer}
        selectedRequests={selectedRequests}
        handleBulkStatusChange={handleBulkStatusChange}
        handlePrintSelected={handlePrintSelected}
        actionFeedback={actionFeedback}
        onDismissActionFeedback={() => setActionFeedback(null)}
      />

      {/* Loading state */}
      {loading ? (
        <LoadingSpinner minHeight={256} />
      ) : requests.length === 0 ? (
        // Empty states
        searchTerm || filters.statusFilter.length > 0 || filters.omsStatusFilter.length > 0 ? (
          <NoSearchResults searchTerm={searchTerm} />
        ) : (
          <EmptyState message="ยังไม่มีคำขอดับไฟในระบบ" />
        )
      ) : (
        // Mobile or Desktop View
        isMobile ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <MobileCard
                key={request.id}
                request={request}
                isAdmin={isAdmin}
                isUser={isUser}
                isViewer={isViewer}
                isSupervisor={isSupervisor}
                userWorkCenterId={userWorkCenterId}
                selectedRequests={selectedRequests}
                onToggleSelect={handleSelectRequest}
                handleEdit={handleEdit}
                handleDelete={handleDeleteConfirm}
                handleEditOmsStatus={handleEditOmsStatus}
                handleEditStatusRequest={handleEditStatusRequest}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
            <table className="min-w-full bg-white">
              <TableHeader
                selectAll={selectAll}
                onToggleSelectAll={handleSelectAll}
                isAdmin={isAdmin}
                isViewer={isViewer}
                isSupervisor={isSupervisor}
              />
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    request={request}
                    isAdmin={isAdmin}
                    isUser={isUser}
                    isViewer={isViewer}
                    isSupervisor={isSupervisor}
                    userWorkCenterId={userWorkCenterId}
                    selectedRequests={selectedRequests}
                    onToggleSelect={handleSelectRequest}
                    handleEdit={handleEdit}
                    handleDelete={handleDeleteConfirm}
                    handleEditOmsStatus={handleEditOmsStatus}
                    handleEditStatusRequest={handleEditStatusRequest}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination Controls */}
      {!loading && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={displayRange.total}
          displayStart={displayRange.start}
          displayEnd={displayRange.end}
          onPageChange={paginate}
          onItemsPerPageChange={(newItemsPerPage) =>
            updatePagination({ itemsPerPage: newItemsPerPage })
          }
        />
      )}

      {/* Edit Modal */}
      {editingRequest && (
        <UpdatePowerOutageRequestModal
          initialData={{
            outageDate: editingRequest.outageDate.toISOString().split("T")[0],
            startTime: editingRequest.startTime.toTimeString().slice(0, 5),
            endTime: editingRequest.endTime.toTimeString().slice(0, 5),
            workCenterId: String(editingRequest.workCenterId),
            branchId: String(editingRequest.branchId),
            transformerNumber: editingRequest.transformerNumber,
            gisDetails: editingRequest.gisDetails,
            area: editingRequest.area,
          }}
          onSubmit={handleUpdate}
          onCancel={handleCancelEdit}
          open={!!editingRequest}
        />
      )}

      <ConfirmDialog
        opened={!!confirmAction}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        isDestructive={confirmAction?.isDestructive}
      />
    </div>
  );
}
