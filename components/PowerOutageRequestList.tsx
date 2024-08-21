"use client";
import { useState, useEffect, useCallback } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  getPowerOutageRequests,
  updatePowerOutageRequest,
  deletePowerOutageRequest,
  updateOMS,
  updateStatusRequest,
} from "@/app/api/action/powerOutageRequest";
import UpdatePowerOutageRequestModal from "./UpdateRequesr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faSearch,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { OMSStatus, Request } from "@prisma/client";

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

const ActionButtons: React.FC<{
  request: PowerOutageRequest;
  onEdit: (request: PowerOutageRequest) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
  isUser: boolean;
}> = ({ request, onEdit, onDelete, isAdmin, isUser }) => {
  if (isAdmin || (isUser && request.statusRequest === "NOT")) {
    return (
      <>
        <button
          onClick={() => onEdit(request)}
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2 text-sm transition duration-300"
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button
          onClick={() => onDelete(request.id)}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mr-2 text-sm transition duration-300"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </>
    );
  }
  return null;
};

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
    }
  }, [authLoading, loadRequests, currentPage]);

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

  // New function for handling multiple selection
  const handleSelectRequest = (id: number) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
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
    const today = new Date();
    const diffDays = Math.ceil(
      (outageDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  
    // เงื่อนไขใหม่: สีแดงเมื่อสถานะอนุมัติเป็น "รอดำเนินการ" และเหลือเวลาน้อยกว่า 15 วัน
    if (statusRequest === "NOT" && diffDays < 15 && diffDays > 0) {
      return "bg-red-500";
    }
  
    // เงื่อนไขเดิม: สำหรับสถานะอนุมัติแล้ว แต่ OMS ยังไม่ดำเนินการ
    if (omsStatus === "NOT_ADDED" && statusRequest !== "NOT" && statusRequest !== "CANCELLED") {
      if (diffDays <= 3 && diffDays > 0) return "bg-red-500";
      if (diffDays <= 7 && diffDays > 0) return "bg-yellow-500";
      if (diffDays <= 15 && diffDays > 0) return "bg-green-500";
    }
  
    // ไม่แสดงสีในกรณีอื่นๆ
    return "";
  };

  const filteredRequests = filterByDate(requests).filter(
    (request) =>
      request.transformerNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.createdBy.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  // ใช้ LoadingSpinner ในส่วน loading

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (authLoading)
    return <div className="text-center py-10">กำลังโหลดข้อมูลผู้ใช้...</div>;
  if (loading)
    return <div className="text-center py-10">กำลังโหลดข้อมูลคำขอดับไฟ...</div>;
  if (error)
    return <div className="text-red-500 text-center py-10">{error}</div>;

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {(isUser || isAdmin) && (
            <Link
              href="/power-outage-requests/create"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              สร้างคำขอดับไฟใหม่
            </Link>
          )}
          <select
            onChange={(e) => handleBulkStatusChange(e.target.value as Request)}
            disabled={selectedRequests.length === 0}
            className="bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">เปลี่ยนสถานะที่เลือก</option>
            <option value="CONFIRM">อนุมัติดับไฟ</option>
            <option value="CANCELLED">ยกเลิก</option>
            <option value="NOT">รออนุมัติ</option>
          </select>
        </div>
        <span className="text-sm text-gray-600">
          {selectedRequests.length} รายการที่เลือก
        </span>
      </div>

      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                เลือก
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                วันที่ดับไฟ
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                เวลา
              </th>
              {(isAdmin || isViewer) && (
                <>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ศูนย์งาน
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สาขา
                  </th>
                </>
              )}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                หมายเลขหม้อแปลง
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                บริเวณ
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ OMS
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะอนุมัติ
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ผู้สร้างคำขอ
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                การดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.map((request) => {
              const bgColor = getRowBackgroundColor(
                request.outageDate,
                request.omsStatus,
                request.statusRequest
              );
              return (
                <tr
                  key={request.id}
                  className={`hover:bg-gray-50 transition-colors ${bgColor}`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedRequests.includes(request.id)}
                      onChange={() => handleSelectRequest(request.id)}
                      disabled={
                        !(
                          isAdmin ||
                          (isUser && request.workCenter.id === userWorkCenterId)
                        )
                      }
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                  </td>
                  <td className="py-3 px-4">
                    {request.outageDate.toLocaleDateString("th-TH")}
                  </td>
                  <td className="py-3 px-4">
                    {request.startTime.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -
                    {request.endTime.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  {(isAdmin || isViewer) && (
                    <>
                      <td className="py-3 px-4">{request.workCenter.name}</td>
                      <td className="py-3 px-4">{request.branch.shortName}</td>
                    </>
                  )}
                  <td className="py-3 px-4">{request.transformerNumber}</td>
                  <td className="py-3 px-4">{request.area}</td>
                  <td className="py-3 px-4">
                    <select
                      value={request.omsStatus}
                      onChange={(e) =>
                        handleEditOmsStatus(
                          request.id,
                          e.target.value as OMSStatus
                        )
                      }
                      disabled={!isAdmin && !isSupervisor}
                      className="border border-gray-300 rounded px-2 py-1 w-full"
                    >
                      <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
                      <option value="PROCESSED">ดำเนินการแล้ว</option>
                      <option value="CANCELLED">ยกเลิก</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={request.statusRequest}
                      onChange={(e) =>
                        handleEditStatusRequest(
                          request.id,
                          e.target.value as Request
                        )
                      }
                      disabled={
                        !(
                          isAdmin ||
                          (isUser && request.workCenter.id === userWorkCenterId)
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1 w-full"
                    >
                      <option value="CONFIRM">อนุมัติดับไฟ</option>
                      <option value="CANCELLED">ยกเลิก</option>
                      <option value="NOT">รออนุมัติ</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">{request.createdBy.fullName}</td>
                  <td className="py-3 px-4">
                    <ActionButtons
                      request={request}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isAdmin={isAdmin}
                      isUser={isUser}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <nav
          className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
          aria-label="Pagination"
        >
          {Array.from(
            { length: Math.ceil(filteredRequests.length / itemsPerPage) },
            (_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                  ${
                    currentPage === i + 1
                      ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                  }
                `}
              >
                {i + 1}
              </button>
            )
          )}
        </nav>
      </div>

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
