"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  getPowerOutageRequests,
  updatePowerOutageRequest,
  deletePowerOutageRequest,
  updateOMS,
  updateStatusRequest,
} from "@/app/api/action/powerOutageRequest";
import UpdatePowerOutageRequestModal from "./UpdateRequesr";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faEdit,
//   faTrash,
//   faSearch,
//   faPlus,
//   faPrint,
// } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { OMSStatus, Request } from "@prisma/client";
import PrintAnnouncement from "./print";
import Pagination from "@/app/power-outage-requests/pagination";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { getThailandDateAtMidnight } from "@/lib/date-utils";

// Import components from PowerOutageRequest folder
import { TableHeader } from "./PowerOutageRequest/TableHeader";
import { TableRow } from "./PowerOutageRequest/TableRow";
import { MobileCard } from "./PowerOutageRequest/MobileCard";
import { FilterSection } from "./PowerOutageRequest/FilterSection";
import { SearchSection } from "./PowerOutageRequest/SearchSection";
import { BulkActions } from "./PowerOutageRequest/BulkActions";
import { OMSStatusSummary } from "./PowerOutageRequest/OMSStatusSummary";
// import { printSelectedRequests } from "./PowerOutageRequest/PrintService";

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

// const ActionButtons: React.FC<{
//   request: PowerOutageRequest;
//   onEdit: (request: PowerOutageRequest) => void;
//   onDelete: (id: number) => void;
//   isAdmin: boolean;
//   isUser: boolean;
// }> = ({ request, onEdit, onDelete, isAdmin, isUser }) => {
//   if (isAdmin || (isUser && request.statusRequest === "NOT")) {
//     return (
//       <>
//         <button
//           onClick={() => onEdit(request)}
//           className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2 text-sm transition duration-300"
//         >
//           <FontAwesomeIcon icon={faEdit} />
//         </button>
//         <button
//           onClick={() => onDelete(request.id)}
//           className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mr-2 text-sm transition duration-300"
//         >
//           <FontAwesomeIcon icon={faTrash} />
//         </button>
//       </>
//     );
//   }
//   return null;
// };

export default function PowerOutageRequestList() {
  const {
    isAdmin,
    isUser,
    isViewer,
    isManager,
    isSupervisor,
    userWorkCenterId,
    isLoading: authLoading,
  } = useAuth();

  const [requests, setRequests] = useState<PowerOutageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] =
    useState<PowerOutageRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectAll, setSelectAll] = useState(false);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(["CONFIRM"]);
  const [omsStatusFilter, setOmsStatusFilter] = useState<string[]>(["NOT_ADDED"]);
  const [workCenterFilter, setWorkCenterFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showPastOutageDates, setShowPastOutageDates] = useState(false);

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

  const fetchWorkCenters = useCallback(async () => {
    try {
      const centers = await getWorkCenters();
      setWorkCenters(centers);
    } catch (err) {
      console.error("ไม่สามารถดึงข้อมูลจุดรวมงานได้:", err);
    }
  }, []);

  const handleWorkCenterFilter = useCallback((value: string) => {
    setWorkCenterFilter(value);
    setCurrentPage(1);
  }, []);

  const handleBranchFilter = useCallback((value: string) => {
    setBranchFilter(value);
    setCurrentPage(1);
  }, []);

  const filterByOMSStatus = (requests: PowerOutageRequest[]) => {
    if (omsStatusFilter.length === 0) return requests;
    return requests.filter((request) =>
      omsStatusFilter.includes(request.omsStatus)
    );
  };

  const filterByStatus = (requests: PowerOutageRequest[]) => {
    if (statusFilter.length === 0) return requests;
    return requests.filter((request) =>
      statusFilter.includes(request.statusRequest)
    );
  };
  
  const filterByWorkcenter = (requests: PowerOutageRequest[]) => {
    if (!workCenterFilter) return requests;
    return requests.filter((request) => 
      request.workCenterId === parseInt(workCenterFilter)
    );
  };

  const filterByBranch = (requests: PowerOutageRequest[]) => {
    if (!branchFilter) return requests;
    return requests.filter((request) => 
      request.branchId === parseInt(branchFilter)
    );
  };

  const filterByDate = (requests: PowerOutageRequest[]) => {
    return requests.filter((request) => {
      const requestDate = new Date(request.outageDate);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return requestDate >= start && requestDate <= end;
      } else if (start) {
        return requestDate >= start;
      } else if (end) {
        return requestDate <= end;
      }
      return true;
    });
  };

  const filterByOutageDate = (requests: PowerOutageRequest[]) => {
    if (showPastOutageDates) {
      return requests;
    }
    const today = getThailandDateAtMidnight();
    return requests.filter(request => {
      const outageDate = new Date(request.outageDate);
      return outageDate >= today || 
             request.omsStatus === "PROCESSED" || 
             request.omsStatus === "CANCELLED";
    });
  };

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getPowerOutageRequests();

      const formattedResult = result.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        outageDate: new Date(item.outageDate),
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
        statusUpdatedAt: item.statusUpdatedAt
          ? new Date(item.statusUpdatedAt)
          : null,
      }));

      const filteredResult = formattedResult.filter((request) => {
        if (isAdmin || isViewer) {
          return true;
        }
        if (
          (isUser || isManager || isSupervisor) &&
          request.workCenter.id === userWorkCenterId
        ) {
          return true;
        }
        return false;
      });

      setRequests(filteredResult);
      setError(null);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isViewer, isUser, isManager, isSupervisor, userWorkCenterId]);
  
  useEffect(() => {
    if (!authLoading) {
      loadRequests();
      fetchWorkCenters();
    }
  }, [authLoading, loadRequests, fetchWorkCenters]);

  const handleEdit = (request: PowerOutageRequest) => {
    setEditingRequest(request);
  };

  const handleUpdate = async (data: PowerOutageRequestInput) => {
    if (!editingRequest) {
      console.error("No request is currently being edited");
      return;
    }

    try {
      const result = await updatePowerOutageRequest(editingRequest.id, data);
      if (result.success) {
        setEditingRequest(null);
        await loadRequests();
      } else {
        console.error("เกิดข้อผิดพลาดในการอัปเดตคำขอดับไฟ:", result.error);
      }
    } catch (error) {
      console.error("Error updating power outage request:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingRequest(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบคำขอนี้?")) {
      try {
        const result = await deletePowerOutageRequest(id);
        if (result.success) {
          setRequests((prevRequests) =>
            prevRequests.filter((req) => req.id !== id)
          );
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการลบคำขอ");
        console.error(err);
      }
    }
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedRequests(currentItems.map((request) => request.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectRequest = (id: number) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
    );
    // ตรวจสอบว่าทุกรายการถูกเลือกหรือไม่
    setSelectAll(
      currentItems.every((request) => selectedRequests.includes(request.id))
    );
  };

  const handleBulkStatusChange = async (newStatus: Request) => {
    if (
      window.confirm(
        `คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะของรายการที่เลือกเป็น ${newStatus}?`
      )
    ) {
      try {
        for (const id of selectedRequests) {
          await updateStatusRequest(id, newStatus);
        }
        await loadRequests();
        setSelectedRequests([]);
      } catch (error) {
        console.error("Error updating multiple requests:", error);
        setError("เกิดข้อผิดพลาดในการอัปเดตสถานะหลายรายการ");
      }
    }
  };

  const handleEditOmsStatus = async (id: number, newStatus: OMSStatus) => {
    try {
      const result = await updateOMS(id, newStatus);
      if (result.success) {
        console.log(
          `Successfully updated OMS Status for request ${id} to ${newStatus}`
        );
        await loadRequests();
      } else {
        console.error(`Failed to update OMS Status: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error updating OMS Status: ${error}`);
    }
  };

  const handleEditStatusRequest = async (id: number, newStatus: Request) => {
    try {
      const result = await updateStatusRequest(id, newStatus);
      if (result.success) {
        console.log(
          `Successfully updated Status Request for request ${id} to ${newStatus}`
        );
        await loadRequests();
      } else {
        console.error(`Failed to update Status Request: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error updating Status Request: ${error}`);
    }
  };

  const getRowBackgroundColor = (
    outageDate: Date,
    omsStatus: string,
    statusRequest: string
  ) => {
    const today = getThailandDateAtMidnight();
    const diffDays = Math.ceil(
      (outageDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // เงื่อนไขใหม่: สีแดงเมื่อสถานะอนุมัติเป็น "รอดำเนินการ" และเหลือเวลาน้อยกว่า 15 วัน
    if (statusRequest === "NOT" && diffDays < 15 && diffDays > 0) {
      return "bg-red-400";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "PROCESSED") {
      return "bg-blue-400";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "NOT_ADDED" && diffDays < 0) {
      return "bg-gradient-to-r from-white via-red-500 to-white";
    }

    // เงื่อนไขเดิม: สำหรับสถานะอนุมัติแล้ว แต่ OMS ยังไม่ดำเนินการ
    if (
      omsStatus === "NOT_ADDED" &&
      statusRequest !== "NOT" &&
      statusRequest !== "CANCELLED"
    ) {
      if (diffDays <= 5 && diffDays >= 0) return "bg-red-400";
      if (diffDays <= 7 && diffDays > 0) return "bg-yellow-400";
      if (diffDays <= 15 && diffDays > 0) return "bg-green-400";
    }

    // ไม่แสดงสีในกรณีอื่นๆ
    return "";
  };

  // ใช้ useMemo เพื่อป้องกันการคำนวณซ้ำโดยไม่จำเป็น
  const filteredRequests = useMemo(() => {
    return filterByOutageDate(
      filterByBranch(
        filterByWorkcenter(
          filterByOMSStatus(
            filterByStatus(filterByDate(requests))
          )
        )
      )
    ).filter(
      (request) =>
        request.transformerNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.createdBy.fullName
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [
    requests, 
    searchTerm, 
    omsStatusFilter, 
    statusFilter, 
    workCenterFilter, 
    branchFilter, 
    startDate, 
    endDate, 
    showPastOutageDates
  ]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    // ตรวจสอบว่า filteredRequests มีข้อมูลหรือไม่
    if (filteredRequests.length === 0) {
      return [];
    }
    
    // ตรวจสอบว่าหน้าปัจจุบันเกินจำนวนหน้าทั้งหมดหรือไม่
    const maxPage = Math.ceil(filteredRequests.length / itemsPerPage);
    const validCurrentPage = currentPage > maxPage ? maxPage : currentPage;
    
    const newFirstItem = (validCurrentPage - 1) * itemsPerPage;
    const newLastItem = Math.min(newFirstItem + itemsPerPage, filteredRequests.length);
    
    return filteredRequests.slice(newFirstItem, newLastItem);
  }, [currentPage, filteredRequests, itemsPerPage]);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage)),
  [filteredRequests.length, itemsPerPage]);

  // นิยาม LoadingSpinner ให้กลับมา
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  // ปรับปรุง paginate function เพื่อให้มั่นใจว่าไม่มีการเปลี่ยนหน้าไปยังหน้าที่ไม่มีข้อมูล
  const paginate = useCallback((pageNumber: number) => {
    // ป้องกันการรีเซ็ตหน้าเมื่อกดเลขหน้าเดิม
    if (pageNumber === currentPage) return;
    
    const maxPage = Math.ceil(filteredRequests.length / itemsPerPage);
    pageNumber = Math.max(1, Math.min(pageNumber, maxPage || 1));
    setCurrentPage(pageNumber);
  }, [filteredRequests.length, itemsPerPage, currentPage]);

  const handleStatusFilter = useCallback((value: string[]) => {
    setStatusFilter(value);
  }, []);

  const handleOmsStatusFilter = useCallback((value: string[]) => {
    setOmsStatusFilter(value);
  }, []);

  const handleShowPastOutageDates = useCallback((value: boolean) => {
    setShowPastOutageDates(value);
  }, []);

  const handleSearchTerm = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleStartDate = useCallback((value: string) => {
    setStartDate(value);
  }, []);

  const handleEndDate = useCallback((value: string) => {
    setEndDate(value);
  }, []);

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
          setSearchTerm={handleSearchTerm}
          startDate={startDate}
          setStartDate={handleStartDate}
          endDate={endDate}
          setEndDate={handleEndDate}
          workCenterFilter={workCenterFilter}
          setWorkCenterFilter={handleWorkCenterFilter}
          workCenters={workCenters}
          isAdmin={isAdmin}
          isViewer={isViewer}
          branchFilter={branchFilter}
          setBranchFilter={handleBranchFilter}
        />
      </div>
      
      {/* Filter Section */}
      <FilterSection 
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilter}
        omsStatusFilter={omsStatusFilter}
        setOmsStatusFilter={handleOmsStatusFilter}
        showPastOutageDates={showPastOutageDates}
        setShowPastOutageDates={handleShowPastOutageDates}
      />
      
      {/* OMS Status Summary - แสดงเฉพาะ admin และ viewer เท่านั้น */}
      {(isAdmin || isViewer) && <OMSStatusSummary requests={requests} />}
      
      {/* Bulk Actions Section */}
      <BulkActions 
        isUser={isUser}
        isAdmin={isAdmin}
        isViewer={isViewer}
        selectedRequests={selectedRequests}
        requests={requests}
        handleBulkStatusChange={handleBulkStatusChange}
      />
      
      {/* Mobile or Desktop View Based on Screen Size */}
      {isMobile ? (
        // Mobile View
        <div className="space-y-4">
          {currentItems.map((request) => (
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
              handleDelete={handleDelete}
              handleEditOmsStatus={handleEditOmsStatus}
              handleEditStatusRequest={handleEditStatusRequest}
            />
          ))}
        </div>
      ) : (
        // Desktop View
        <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
          <table className="min-w-full bg-white">
            <TableHeader 
              selectAll={selectAll}
              setSelectAll={handleSelectAll}
              isAdmin={isAdmin}
              isViewer={isViewer}
            />
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((request) => (
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
                  handleDelete={handleDelete}
                  handleEditOmsStatus={handleEditOmsStatus}
                  handleEditStatusRequest={handleEditStatusRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={paginate}
        />
      </div>

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
