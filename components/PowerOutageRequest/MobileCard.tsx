"use client";
import { useState } from "react";
import { OMSStatus, Request } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faChevronDown, faChevronUp, faCalendarAlt, faClock, faMapMarkerAlt, faUser, faBuilding, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { getThailandDateAtMidnight } from "@/lib/date-utils";

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

interface MobileCardProps {
  request: PowerOutageRequest;
  isAdmin: boolean;
  isUser: boolean;
  isViewer: boolean;
  isSupervisor: boolean;
  userWorkCenterId?: number;
  selectedRequests: number[];
  setSelectedRequests: React.Dispatch<React.SetStateAction<number[]>>;
  handleEdit: (request: PowerOutageRequest) => void;
  handleDelete: (id: number) => void;
  handleEditOmsStatus: (id: number, status: OMSStatus) => void;
  handleEditStatusRequest: (id: number, status: Request) => void;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  request,
  isAdmin,
  isUser,
  isViewer,
  isSupervisor,
  userWorkCenterId,
  selectedRequests,
  setSelectedRequests,
  handleEdit,
  handleDelete,
  handleEditOmsStatus,
  handleEditStatusRequest,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleSelectRequest = (id: number) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
    );
  };

  const getCardBackgroundColor = (
    outageDate: Date,
    omsStatus: string,
    statusRequest: string
  ) => {
    const today = getThailandDateAtMidnight();
    const diffDays = Math.ceil(
      (outageDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (statusRequest === "NOT" && diffDays < 15 && diffDays > 0) {
      return "bg-red-400 border-l-4 border-red-500";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "PROCESSED") {
      return "bg-blue-400 border-l-4 border-blue-500";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "NOT_ADDED" && diffDays < 0) {
      return "bg-gradient-to-r from-white via-red-500 to-white border-l-4 border-red-500";
    }

    if (
      omsStatus === "NOT_ADDED" &&
      statusRequest !== "NOT" &&
      statusRequest !== "CANCELLED"
    ) {
      if (diffDays <= 5 && diffDays >= 0) return "bg-red-400 border-l-4 border-red-500";
      if (diffDays <= 7 && diffDays > 0) return "bg-yellow-400 border-l-4 border-yellow-500";
      if (diffDays <= 15 && diffDays > 0) return "bg-green-400 border-l-4 border-green-500";
    }

    return "bg-white border-l-4 border-gray-300";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "CONFIRM":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">อนุมัติดับไฟ</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">ยกเลิก</span>;
      case "NOT":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">รออนุมัติ</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getOmsStatusLabel = (status: string) => {
    switch (status) {
      case "NOT_ADDED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">ยังไม่ดำเนินการ</span>;
      case "PROCESSED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">ดำเนินการแล้ว</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">ยกเลิก</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const bgColor = getCardBackgroundColor(
    request.outageDate,
    request.omsStatus,
    request.statusRequest
  );

  const canEdit = isAdmin || (isUser && request.workCenter.id === userWorkCenterId) && !isViewer;

  return (
    <div className={`mb-4 rounded-lg shadow-md overflow-hidden ${bgColor}`}>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            {!isViewer && (
              <input
                type="checkbox"
                checked={selectedRequests.includes(request.id)}
                onChange={() => handleSelectRequest(request.id)}
                disabled={!(isAdmin || (isUser && request.workCenter.id === userWorkCenterId))}
                className="form-checkbox h-5 w-5 text-blue-600 mt-1"
              />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-gray-800 text-lg">{request.transformerNumber}</h3>
                {getStatusLabel(request.statusRequest)}
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                <span>{request.outageDate.toLocaleDateString("th-TH")}</span>
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <FontAwesomeIcon icon={faClock} className="mr-1" />
                <span>
                  {request.startTime.toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} - 
                  {request.endTime.toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {request.area && (
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                  <span className="truncate max-w-[200px]">{request.area}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
            aria-label={expanded ? "ย่อ" : "ขยาย"}
          >
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
            {(isAdmin || isViewer) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <FontAwesomeIcon icon={faBuilding} className="mr-1" />
                    ศูนย์งาน
                  </p>
                  <p className="text-gray-800 font-medium">{request.workCenter.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
                    สาขา
                  </p>
                  <p className="text-gray-800 font-medium">{request.branch.shortName}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 flex items-center">
                <FontAwesomeIcon icon={faUser} className="mr-1" />
                ผู้สร้างคำขอ
              </p>
              <p className="text-gray-800 font-medium">{request.createdBy.fullName}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 mb-1">สถานะ OMS</p>
                <div className="flex items-center space-x-2 mb-2">
                  {getOmsStatusLabel(request.omsStatus)}
                </div>
                {(isAdmin || isSupervisor) && (
                  <select
                    value={request.omsStatus}
                    onChange={(e) => handleEditOmsStatus(request.id, e.target.value as OMSStatus)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
                    <option value="PROCESSED">ดำเนินการแล้ว</option>
                    <option value="CANCELLED">ยกเลิก</option>
                  </select>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">สถานะอนุมัติ</p>
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusLabel(request.statusRequest)}
                </div>
                {(isAdmin || (isUser && request.workCenter.id === userWorkCenterId)) && (
                  <select
                    value={request.statusRequest}
                    onChange={(e) => handleEditStatusRequest(request.id, e.target.value as Request)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="CONFIRM">อนุมัติดับไฟ</option>
                    <option value="CANCELLED">ยกเลิก</option>
                    <option value="NOT">รออนุมัติ</option>
                  </select>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => handleEdit(request)}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(request.id)}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-300 flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faTrash} className="mr-2" />
                  ลบ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 