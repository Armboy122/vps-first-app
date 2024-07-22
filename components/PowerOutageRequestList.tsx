"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  getPowerOutageRequests,
  updatePowerOutageRequest,
  deletePowerOutageRequest,
} from "@/app/api/action/powerOutageRequest";
import UpdatePowerOutageRequestModal from "./UpdateRequesr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

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
  workCenter: { name: string };
  branch: { shortName: string };
}

export default function PowerOutageRequestList() {
  const [requests, setRequests] = useState<PowerOutageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] =
    useState<PowerOutageRequest | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    loadRequests();
  }, []);

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
      setRequests(formattedResult);
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
    if (!editingRequest) return;
    try {
      const result = await updatePowerOutageRequest(editingRequest.id, data);
      if (result.success && result.data) {
        setRequests((prevRequests) =>
          prevRequests.map((req) =>
            req.id === editingRequest.id
              ? {
                  ...req,
                  ...result.data,
                  createdAt: new Date(result.data.createdAt),
                  outageDate: new Date(result.data.outageDate),
                  startTime: new Date(result.data.startTime),
                  endTime: new Date(result.data.endTime),
                  statusUpdatedAt: result.data.statusUpdatedAt
                    ? new Date(result.data.statusUpdatedAt)
                    : null,
                }
              : req
          )
        );
        setEditingRequest(null);
      } else {
        setError("ผิดพลาดจากการแก้ไข");
      }
    } catch (err) {
      setError("An error occurred while updating the request");
      console.error(err);
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

  const handleEditOmsStatus = (id: number, newStatus: string) => {
    // โค้ดสำหรับการอัปเดต OMS Status
    console.log(`Updating OMS Status for request ${id} to ${newStatus}`);
  };

  const handleEditStatusRequest = (id: number, newStatus: string) => {
    // โค้ดสำหรับการอัปเดต Status Request
    console.log(`Updating Status Request for request ${id} to ${newStatus}`);
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

    if (diffDays < 3) return "bg-red-100";
    if (diffDays < 7) return "bg-yellow-100";
    return "";
  };

  if (loading) return <div>กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const isAdmin = session?.user?.role === "ADMIN";
  const isUser = session?.user?.role === "USER";
  const viewer = session?.user?.role === "VIEWER";

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">รายการคำขอดับไฟ</h2>
      {(isUser || isAdmin ) && (
        <Link
          href="/power-outage-requests/create"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          สร้างคำขอดับไฟใหม่
        </Link>
      )}

      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left">วันที่ดับไฟ</th>
              <th className="py-3 px-4 text-left">เวลาเริ่มต้น</th>
              <th className="py-3 px-4 text-left">เวลาสิ้นสุด</th>
              {(isAdmin || viewer) && (
                <th className="py-3 px-4 text-left">ศูนย์งาน</th>
              )}
              {(isAdmin || viewer) && (
                <th className="py-3 px-4 text-left">สาขา</th>
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
            {requests.map((request, index) => (
              <tr
                key={request.id}
                className={`${
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                } hover:bg-gray-100 transition-colors ${getRowBackgroundColor(
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
                {(isAdmin || viewer) && (
                  <td className="py-2 px-4">{request.workCenter.name}</td>
                )}
                {(isAdmin || viewer) && (
                  <td className="py-2 px-4">{request.branch.shortName}</td>
                )}
                <td className="py-2 px-4">{request.transformerNumber}</td>
                <td className="py-2 px-4">{request.area}</td>
                <td className="py-2 px-4">
                  <div>
                    <select
                      value={request.omsStatus}
                      onChange={(e) =>
                        handleEditOmsStatus(request.id, e.target.value)
                      }
                      disabled={
                        request.statusRequest === "NOT" ||
                        request.statusRequest === "CANCELLED"
                      }
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
                      <option value="PROCESSED">ดำเนินการแล้ว</option>
                      <option value="CANCELLED">ยกเลิก</option>
                    </select>
                  </div>
                </td>
                <td className="py-2 px-4">
                  <div>
                    <select
                      value={request.statusRequest}
                      onChange={(e) =>
                        handleEditStatusRequest(request.id, e.target.value)
                      }
                      disabled={
                        request.statusRequest === "NOT" ||
                        request.statusRequest === "CANCELLED"
                      }
                      className="border border-gray-300 rounded px-2 py-1 mt-2"
                    >
                      <option value="CONFIRM ">อนุมัติดับไฟ</option>
                      <option value="CANCELLED">ยกเลิก</option>
                      <option value="NOT">รออนุมัติ</option>
                    </select>
                  </div>
                </td>
                <td className="py-2 px-4">{request.createdBy.fullName}</td>
                <td className="py-2 px-4">
                  {isUser && (
                    <>
                      <button
                        onClick={() => handleEdit(request)}
                        disabled={request.statusRequest !== "NOT"}
                        className={`bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2 text-sm ${
                          request.statusRequest !== "NOT"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(request.id)}
                        disabled={request.statusRequest !== "NOT"}
                        className={`bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm ${
                          request.statusRequest !== "NOT"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(request)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2 text-sm"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mr-2 text-sm"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
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
  );
}
