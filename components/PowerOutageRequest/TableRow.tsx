"use client";
import { OMSStatus, Request } from "@prisma/client";
import { ActionButtons } from "./ActionButtons";
import { useState, memo, useCallback } from "react";
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
const TextWithTooltip = memo(({ text, maxLength = 20 }: { text: string | null; maxLength?: number }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  if (!text) return <span className="text-gray-400">-</span>;
  
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.substring(0, maxLength)}...` : text;
  
  if (!shouldTruncate) {
    return <span>{displayText}</span>;
  }
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };
  
  return (
    <div className="relative inline-block w-full">
      <span 
        className="cursor-pointer border-b border-dotted border-gray-400 transition-colors duration-200 hover:text-blue-600"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {displayText}
      </span>
      {showTooltip && (
        <div 
          className="fixed z-[9999] bg-gray-800 text-white text-sm px-3 py-2 rounded-md shadow-lg pointer-events-none max-w-xs break-words"
          style={{
            left: `${mousePos.x + 10}px`,
            top: `${mousePos.y - 40}px`,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
});

TextWithTooltip.displayName = 'TextWithTooltip';

// คอมโพเนนต์สำหรับแสดงสถานะด้วยสีและรูปแบบที่สวยงาม
const StatusBadge = memo(({ status, type }: { status: string; type: "oms" | "request" }) => {
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
});

StatusBadge.displayName = 'StatusBadge';

export const TableRow = memo(({
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
}: TableRowProps) => {
  const handleSelectRequest = useCallback((id: number) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((reqId) => reqId !== id) : [...prev, id]
    );
  }, [setSelectedRequests]);

  const getRowBackgroundColor = useCallback((
    outageDate: Date,
    omsStatus: string,
    statusRequest: string
  ) => {
    const today = getThailandDateAtMidnight();
    const diffDays = Math.ceil(
      (outageDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (statusRequest === "NOT" && diffDays < 10 && diffDays > 0) {
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
  }, []);

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
  const formatThaiDate = useCallback((date: Date) => {
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
  }, []);

  const handleOmsStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleEditOmsStatus(request.id, e.target.value as OMSStatus);
  }, [handleEditOmsStatus, request.id]);

  const handleStatusRequestChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleEditStatusRequest(request.id, e.target.value as Request);
  }, [handleEditStatusRequest, request.id]);

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${bgColor} border-b border-gray-200`}>
      {!isViewer && (
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
      )}
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
            onChange={handleOmsStatusChange}
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
            onChange={handleStatusRequestChange}
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
      {!isViewer && !isSupervisor && (
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
      )}
      <td className={`${cellClass} ${dateClass}`}>
        {formatThaiDate(request.createdAt)}
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow'; 