"use client";
import { useState, useCallback, useEffect } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { updatePowerOutageRequest } from "@/app/api/action/powerOutageRequest";
import UpdatePowerOutageRequestModal from "./UpdateRequesr";
import { useAuth } from "@/lib/useAuth";
import { OMSStatus, Request } from "@prisma/client";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { useLogger } from "@/hooks/useLogger";
import { logUserAction, logFormInteraction, logError } from "@/lib/utils/logger";

// Import custom hook
import { usePowerOutageRequests } from "@/hooks/usePowerOutageRequests";

// Import components from PowerOutageRequest folder
import { TableHeader } from "./PowerOutageRequest/TableHeader";
import { TableRow } from "./PowerOutageRequest/TableRow";
import { MobileCard } from "./PowerOutageRequest/MobileCard";
import { FilterSection } from "./PowerOutageRequest/FilterSection";
import { SearchSection } from "./PowerOutageRequest/SearchSection";
import { BulkActions } from "./PowerOutageRequest/BulkActions";
import { OMSStatusSummary } from "./PowerOutageRequest/OMSStatusSummary";
import { PaginationControls } from "./PowerOutageRequest/PaginationControls";

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

  // Use custom hook for data management
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
    getRowBackgroundColor
  } = usePowerOutageRequests();

  // Local state for UI only
  const [editingRequest, setEditingRequest] = useState<PowerOutageRequest | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the screen is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

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

  // UI handlers
  const handleEdit = (request: PowerOutageRequest) => {
    logUserAction('power_outage_request_edit_clicked', {
      requestId: request.id,
      transformerNumber: request.transformerNumber,
      outageDate: request.outageDate,
      currentStatus: request.statusRequest,
      omsStatus: request.omsStatus
    });
    setEditingRequest(request);
  };

  const handleUpdate = async (data: PowerOutageRequestInput) => {
    if (!editingRequest) {
      logError('power_outage_request_update_failed', 'No request is currently being edited');
      return;
    }

    logFormInteraction('power_outage_request_update_started', {
      requestId: editingRequest.id,
      changes: data
    });

    try {
      const result = await updatePowerOutageRequest(editingRequest.id, data);
      if (result.success) {
        logUserAction('power_outage_request_updated', {
          requestId: editingRequest.id,
          updatedData: data,
          success: true
        });
        setEditingRequest(null);
        await loadRequests();
      } else {
        logError('power_outage_request_update_failed', result.error || 'Unknown error', {
          requestId: editingRequest.id,
          data
        });
        console.error("เกิดข้อผิดพลาดในการอัปเดตคำขอดับไฟ:", result.error);
      }
    } catch (error) {
      logError('power_outage_request_update_error', error as Error, {
        requestId: editingRequest.id,
        data
      });
      console.error("Error updating power outage request:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingRequest(null);
  };

  // Delete handler using hook method
  const handleDeleteConfirm = async (id: number) => {
    const request = requests.find(r => r.id === id);
    
    logUserAction('power_outage_request_delete_confirm_shown', {
      requestId: id,
      transformerNumber: request?.transformerNumber
    });
    
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบคำขอนี้?")) {
      logUserAction('power_outage_request_delete_confirmed', {
        requestId: id,
        transformerNumber: request?.transformerNumber
      });
      await handleDelete(id);
    } else {
      logUserAction('power_outage_request_delete_cancelled', {
        requestId: id
      });
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      const selectedIds = requests.map((request) => request.id);
      setSelectedRequests(selectedIds);
      logUserAction('power_outage_requests_select_all', {
        selectedCount: selectedIds.length,
        requestIds: selectedIds
      });
    } else {
      setSelectedRequests([]);
      logUserAction('power_outage_requests_deselect_all', {
        previousCount: requests.length
      });
    }
  };

  const handleSelectRequest = (id: number) => {
    const isCurrentlySelected = selectedRequests.includes(id);
    const newSelectedRequests = isCurrentlySelected 
      ? selectedRequests.filter((reqId) => reqId !== id)
      : [...selectedRequests, id];
      
    setSelectedRequests(newSelectedRequests);
    
    logUserAction('power_outage_request_selection_changed', {
      requestId: id,
      action: isCurrentlySelected ? 'deselected' : 'selected',
      totalSelected: newSelectedRequests.length
    });
    
    // ตรวจสอบว่าทุกรายการถูกเลือกหรือไม่
    setSelectAll(
      requests.every((request) => newSelectedRequests.includes(request.id))
    );
  };

  // Bulk operations
  const handleBulkStatusChange = async (newStatus: Request) => {
    logUserAction('bulk_status_change_confirm_shown', {
      newStatus,
      selectedCount: selectedRequests.length,
      requestIds: selectedRequests
    });
    
    if (
      window.confirm(
        `คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะของรายการที่เลือกเป็น ${newStatus}?`
      )
    ) {
      logUserAction('bulk_status_change_confirmed', {
        newStatus,
        selectedCount: selectedRequests.length,
        requestIds: selectedRequests
      });
      
      try {
        for (const id of selectedRequests) {
          await handleUpdateStatus(id, newStatus);
        }
        
        logUserAction('bulk_status_change_completed', {
          newStatus,
          processedCount: selectedRequests.length,
          success: true
        });
        
        setSelectedRequests([]);
      } catch (error) {
        logError('bulk_status_change_failed', error as Error, {
          newStatus,
          selectedCount: selectedRequests.length,
          requestIds: selectedRequests
        });
        console.error("Error updating multiple requests:", error);
      }
    } else {
      logUserAction('bulk_status_change_cancelled', {
        newStatus,
        selectedCount: selectedRequests.length
      });
    }
  };

  // Status update handlers using hook methods
  const handleEditOmsStatus = async (id: number, newStatus: OMSStatus) => {
    const request = requests.find(r => r.id === id);
    
    logUserAction('oms_status_change_started', {
      requestId: id,
      transformerNumber: request?.transformerNumber,
      oldStatus: request?.omsStatus,
      newStatus
    });
    
    const result = await handleUpdateOMS(id, newStatus);
    if (result.success) {
      logUserAction('oms_status_updated', {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.omsStatus,
        newStatus,
        success: true
      });
    } else {
      logError('oms_status_update_failed', result.error || 'Unknown error', {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.omsStatus,
        newStatus
      });
      console.error(`Failed to update OMS Status: ${result.error}`);
    }
  };

  const handleEditStatusRequest = async (id: number, newStatus: Request) => {
    const request = requests.find(r => r.id === id);
    
    logUserAction('request_status_change_started', {
      requestId: id,
      transformerNumber: request?.transformerNumber,
      oldStatus: request?.statusRequest,
      newStatus
    });
    
    const result = await handleUpdateStatus(id, newStatus);
    if (result.success) {
      logUserAction('request_status_updated', {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.statusRequest,
        newStatus,
        success: true
      });
    } else {
      logError('request_status_update_failed', result.error || 'Unknown error', {
        requestId: id,
        transformerNumber: request?.transformerNumber,
        oldStatus: request?.statusRequest,
        newStatus
      });
      console.error(`Failed to update Status Request: ${result.error}`);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (authLoading)
    return <div className="text-center py-10">กำลังโหลดข้อมูลผู้ใช้...</div>;
  if (loading)
    return <div className="text-center py-10">กำลังโหลดข้อมูลคำขอดับไฟ...</div>;
  if (error)
    return <div className="text-red-500 text-center py-10">{error}</div>;

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Search Section */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
        <SearchSection 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          startDate={filters.startDate}
          setStartDate={(value) => updateFilter('startDate', value)}
          endDate={filters.endDate}
          setEndDate={(value) => updateFilter('endDate', value)}
          workCenterFilter={filters.workCenterFilter}
          setWorkCenterFilter={(value) => updateFilter('workCenterFilter', value)}
          workCenters={workCenters}
          isAdmin={isAdmin}
          isViewer={isViewer}
          branchFilter={filters.branchFilter}
          setBranchFilter={(value) => updateFilter('branchFilter', value)}
        />
      </div>
      
      {/* Filter Section */}
      <FilterSection 
        statusFilter={filters.statusFilter}
        setStatusFilter={(value) => updateFilter('statusFilter', value)}
        omsStatusFilter={filters.omsStatusFilter}
        setOmsStatusFilter={(value) => updateFilter('omsStatusFilter', value)}
        showPastOutageDates={filters.showPastOutageDates}
        setShowPastOutageDates={(value) => updateFilter('showPastOutageDates', value)}
      />
      
      {/* OMS Status Summary - แสดงเฉพาะ admin และ viewer เท่านั้น */}
      {(isAdmin || isViewer) && 
        <OMSStatusSummary 
          requests={allRequests} 
          filteredRequests={allRequests}
          showFilteredSummary={true} // ให้แสดงตามการกรอง
        />
      }
      
      {/* Bulk Actions Section */}
      <BulkActions 
        isUser={isUser}
        isAdmin={isAdmin}
        isViewer={isViewer}
        selectedRequests={selectedRequests}
        requests={allRequests}
        handleBulkStatusChange={handleBulkStatusChange}
      />
      
      {/* Mobile or Desktop View Based on Screen Size */}
      {isMobile ? (
        // Mobile View
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
              setSelectedRequests={setSelectedRequests}
              handleEdit={handleEdit}
              handleDelete={handleDeleteConfirm}
              handleEditOmsStatus={handleEditOmsStatus}
              handleEditStatusRequest={handleEditStatusRequest}
            />
          ))}
        </div>
      ) : (
        // Desktop View
        <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
          <table className="min-w-full bg-white">
            <TableHeader 
              selectAll={selectAll}
              setSelectAll={handleSelectAll}
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
                  setSelectedRequests={setSelectedRequests}
                  handleEdit={handleEdit}
                  handleDelete={handleDeleteConfirm}
                  handleEditOmsStatus={handleEditOmsStatus}
                  handleEditStatusRequest={handleEditStatusRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={displayRange.total}
        displayStart={displayRange.start}
        displayEnd={displayRange.end}
        onPageChange={paginate}
        onItemsPerPageChange={(newItemsPerPage) => updatePagination({ itemsPerPage: newItemsPerPage })}
      />

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
    </div>
  );
}
