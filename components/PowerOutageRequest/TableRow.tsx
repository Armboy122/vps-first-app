"use client";
import { OMSStatus, Request } from "@prisma/client";
import { ActionButtons } from "./ActionButtons";
import { useState } from "react";
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

interface TableRowProps {
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

// ฟังก์ชันสำหรับตัดข้อความที่ยาวเกินไป
const truncateText = (text: string | null, maxLength: number = 20) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// คอมโพเนนต์สำหรับแสดงข้อความพร้อม tooltip เมื่อข้อความยาวเกินไป
const TextWithTooltip: React.FC<{ text: string | null; maxLength?: number }> = ({
  text,
  maxLength = 20,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!text) return <span className="text-gray-400">-</span>;
  
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.substring(0, maxLength)}...` : text;
  
  return (
    <div className="relative group">
      <span 
        className={`${shouldTruncate ? "cursor-pointer" : ""} transition-colors duration-200 group-hover:text-blue-600`}
        onMouseEnter={() => shouldTruncate && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {displayText}
      </span>
      {showTooltip && (
        <div className="absolute z-10 p-2 bg-gray-800 text-white text-sm rounded-md shadow-lg whitespace-normal max-w-xs left-0 -mt-1 transform -translate-y-full animate-fadeIn">
          <div className="relative">
            <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 -bottom-1 left-3"></div>
            {text}
          </div>
        </div>
      )}
    </div>
  );
};

// คอมโพเนนต์สำหรับแสดงสถานะด้วยสีและรูปแบบที่สวยงาม
const StatusBadge: React.FC<{ status: string; type: "oms" | "request" }> = ({ status, type }) => {
  let bgColor = "bg-gray-200";
  let textColor = "text-gray-800";
  let label = status;
  
  if (type === "oms") {
    switch (status) {
      case "NOT_ADDED":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        label = "ยังไม่ดำเนินการ";
        break;
      case "PROCESSED":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        label = "ดำเนินการแล้ว";
        break;
      case "CANCELLED":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        label = "ยกเลิก";
        break;
    }
  } else {
    switch (status) {
      case "CONFIRM":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        label = "อนุมัติดับไฟ";
        break;
      case "NOT":
        bgColor = "bg-orange-100";
        textColor = "text-orange-800";
        label = "รออนุมัติ";
        break;
      case "CANCELLED":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        label = "ยกเลิก";
        break;
    }
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
};

export const TableRow: React.FC<TableRowProps> = ({
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
  const handleSelectRequest = (id: number) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
    );
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

    if (statusRequest === "NOT" && diffDays < 15 && diffDays > 0) {
      return "bg-red-400";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "PROCESSED") {
      return "bg-blue-400";
    }
    if (statusRequest === "CONFIRM" && omsStatus === "NOT_ADDED" && diffDays < 0) {
      return "bg-gradient-to-r from-white via-red-500 to-white";
    }

    if (
      omsStatus === "NOT_ADDED" &&
      statusRequest !== "NOT" &&
      statusRequest !== "CANCELLED"
    ) {
      if (diffDays <= 5 && diffDays >= 0) return "bg-red-500 border-l-4 border-red-400";
      if (diffDays <= 7 && diffDays > 0) return "bg-yellow-500 border-l-4 border-yellow-400";
      if (diffDays <= 15 && diffDays > 0) return "bg-green-500 border-l-4 border-green-400";
    }

    return "border-l-4 border-transparent";
  };

  const bgColor = getRowBackgroundColor(
    request.outageDate,
    request.omsStatus,
    request.statusRequest
  );

  // กำหนดคลาสสำหรับ cell ที่มีข้อมูลยาว
  const cellClass = "py-3 px-2 overflow-hidden align-middle";
  const fixedWidthCell = "min-w-[120px] max-w-[180px]";
  const selectClass = "border border-gray-300 rounded-md px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const transformerClass = "font-medium text-gray-900";
  const dateClass = "font-medium text-gray-700 whitespace-nowrap";

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่แบบไทย
  const formatThaiDate = (date: Date) => {
    try {
      return date.toLocaleDateString("th-TH", {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "ไม่พบข้อมูล";
    }
  };

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${bgColor} border-b border-gray-200`}>
      <td className="py-3 px-2 align-middle">
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
          className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      </td>
      <td className={`${cellClass} ${dateClass}`}>
        {formatThaiDate(request.outageDate)}
      </td>
      <td className={cellClass}>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {request.startTime.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          -
          {request.endTime.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </td>
      {(isAdmin || isViewer) && (
        <>
          <td className={`${cellClass} ${fixedWidthCell}`}>
            <TextWithTooltip text={request.workCenter.name} maxLength={15} />
          </td>
          <td className={cellClass}>
            <TextWithTooltip text={request.branch.shortName} maxLength={10} />
          </td>
        </>
      )}
      <td className={`${cellClass} ${transformerClass} ${fixedWidthCell}`}>
        <TextWithTooltip text={request.transformerNumber} maxLength={15} />
      </td>
      <td className={`${cellClass} ${fixedWidthCell}`}>
        <TextWithTooltip text={request.area} maxLength={20} />
      </td>
      <td className={cellClass}>
        {request.omsStatus === "NOT_ADDED" ? (
          <select
            value={request.omsStatus}
            onChange={(e) =>
              handleEditOmsStatus(
                request.id,
                e.target.value as OMSStatus
              )
            }
            disabled={!isAdmin && !isSupervisor}
            className={selectClass}
          >
            <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
            <option value="PROCESSED">ดำเนินการแล้ว</option>
            <option value="CANCELLED">ยกเลิก</option>
          </select>
        ) : (
          <StatusBadge status={request.omsStatus} type="oms" />
        )}
      </td>
      <td className={cellClass}>
        {request.statusRequest === "NOT" ? (
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
            className={selectClass}
          >
            <option value="CONFIRM">อนุมัติดับไฟ</option>
            <option value="CANCELLED">ยกเลิก</option>
            <option value="NOT">รออนุมัติ</option>
          </select>
        ) : (
          <StatusBadge status={request.statusRequest} type="request" />
        )}
      </td>
      <td className={`${cellClass} ${fixedWidthCell}`}>
        <TextWithTooltip text={request.createdBy.fullName} maxLength={15} />
      </td>
      <td className={cellClass}>
        <div className="flex space-x-1 justify-center">
          <ActionButtons
            request={request}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isAdmin={isAdmin}
            isUser={isUser}
            userWorkCenterId={userWorkCenterId}
          />
        </div>
      </td>
      <td className={`${cellClass} ${dateClass}`}>
        {formatThaiDate(request.createdAt)}
      </td>
    </tr>
  );
}; 