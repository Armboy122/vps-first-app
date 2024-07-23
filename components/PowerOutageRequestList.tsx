"use client";
import { useState, useEffect, useContext } from "react";
import { useSession } from "next-auth/react";
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
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import React from "react";
import { useAuth } from "@/lib/useAuth";
import { OMSStatus , Request} from "@prisma/client";


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

// const RoleProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const roleInfo = useRole();
//   return (
//     <RoleContext.Provider value={roleInfo}>{children}</RoleContext.Provider>
//   );
// };

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
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2 text-sm"
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button
          onClick={() => onDelete(request.id)}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mr-2 text-sm"
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
  const [editingRequest, setEditingRequest] = useState<PowerOutageRequest | null>(null);;


  useEffect(() => {
    if (!authLoading) {
      loadRequests();
    }
  }, [authLoading]);

  async function loadRequests() {
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


      // Filter requests based on user role and work center
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
  }

  const handleEdit = (request: PowerOutageRequest) => {
    setEditingRequest(request);
  };

  const handleUpdate = async (data: PowerOutageRequestInput) => {
    
    if (!editingRequest) {
      console.error('No request is currently being edited');
      return;
    }
  
    try {
      const result = await updatePowerOutageRequest(editingRequest.id, data);
      if (result.success) {
        setEditingRequest(null);
        await loadRequests();
      } else {
        console.error('เกิดข้อผิดพลาดในการอัปเดตคำขอดับไฟ:', result.error);
      }
    } catch (error) {
      console.error('Error updating power outage request:', error);
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
        setError("An error occurred while deleting the request");
        console.error(err);
      }
    }
  };

  const handleEditOmsStatus = async (id: number, newStatus: OMSStatus) => {
    try {
      const result = await updateOMS(id, newStatus);
      if (result.success) {
        console.log(`Successfully updated OMS Status for request ${id} to ${newStatus}`);
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
        console.log(`Successfully updated Status Request for request ${id} to ${newStatus}`);
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
    if (
      omsStatus !== "NOT_ADDED" ||
      statusRequest === "NOT" ||
      statusRequest === "CANCELLED"
    )
      return "";

    const today = new Date();
    const diffDays = Math.ceil(
      (outageDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 3) return "bg-red-100";
    if (diffDays < 7) return "bg-yellow-100";
    return "";
  };

  if (authLoading || loading) return <div>กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <>
      <div className="container mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">รายการคำขอดับไฟ</h2>
        {(isUser || isAdmin) && (
          <Link
            href="/power-outage-requests/create"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            สร้างคำขอดับไฟใหม่
          </Link>
        )}

        <div className="overflow-x-auto shadow-lg rounded-lg mt-4">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">วันที่ดับไฟ</th>
                <th className="py-3 px-4 text-left">เวลาเริ่มต้น</th>
                <th className="py-3 px-4 text-left">เวลาสิ้นสุด</th>
                {(isAdmin || isViewer) && (
                  <>
                    <th className="py-3 px-4 text-left">ศูนย์งาน</th>
                    <th className="py-3 px-4 text-left">สาขา</th>
                  </>
                )}
                <th className="py-3 px-4 text-left">หมายเลขหม้อแปลง</th>
                <th className="py-3 px-4 text-left">บริเวณ</th>
                <th className="py-3 px-4 text-left">สถานะ OMS</th>
                <th className="py-3 px-4 text-left">สถานะ อนุมัติดับไฟ</th>
                <th className="py-3 px-4 text-left">ผู้สร้างคำขอ</th>
                <th className="py-3 px-4 text-left">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className={`hover:bg-gray-100 transition-colors ${getRowBackgroundColor(
                    request.outageDate,
                    request.omsStatus,
                    request.statusRequest
                  )}`}
                >
                  <td className="py-2 px-4">
                    {request.outageDate.toLocaleDateString("th-TH")}
                  </td>
                  <td className="py-2 px-4">
                    {request.startTime.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 px-4">
                    {request.endTime.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  {(isAdmin || isViewer) && (
                    <>
                      <td className="py-2 px-4">{request.workCenter.name}</td>
                      <td className="py-2 px-4">{request.branch.shortName}</td>
                    </>
                  )}
                  <td className="py-2 px-4">{request.transformerNumber}</td>
                  <td className="py-2 px-4">{request.area}</td>
                  <td className="py-2 px-4">
                    <select
                      value={request.omsStatus}
                      onChange={(e) =>
                        handleEditOmsStatus(request.id, e.target.value as OMSStatus)
                      }
                      disabled={!isAdmin && !isSupervisor}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
                      <option value="PROCESSED">ดำเนินการแล้ว</option>
                      <option value="CANCELLED">ยกเลิก</option>
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={request.statusRequest}
                      onChange={(e) =>
                        handleEditStatusRequest(request.id, e.target.value as Request)
                      }
                      disabled={
                        !(
                          isAdmin ||
                          (isUser && request.workCenter.id === userWorkCenterId)
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="CONFIRM">อนุมัติดับไฟ</option>
                      <option value="CANCELLED">ยกเลิก</option>
                      <option value="NOT">รออนุมัติ</option>
                    </select>
                  </td>
                  <td className="py-2 px-4">{request.createdBy.fullName}</td>
                  <td className="py-2 px-4">
                    <ActionButtons
                      request={request}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isAdmin={isAdmin}
                      isUser={isUser}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          />
        )}
      </div>
    </>
  );
}
function getCurrentUserId() {
  throw new Error("Function not implemented.");
}

