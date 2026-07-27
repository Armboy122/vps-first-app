"use client";

import { memo, useCallback, useState } from "react";
import { OMSStatus, Request } from "@prisma/client";
import { ActionButtons } from "./ActionButtons";
import {
  type StatusChipMeta,
  type StatusInfo,
  getOmsStatusMeta,
  getRequestStatusMeta,
  getUrgencyStatus,
} from "@/lib/utils/status-utils";
import type { BusinessDayCalendarConfig } from "@/lib/validations/powerOutageRequest";

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
  onToggleSelect: (id: number) => void;
  handleEdit: (request: PowerOutageRequest) => void;
  handleDelete: (id: number) => void;
  handleEditOmsStatus: (id: number, status: OMSStatus) => void;
  handleEditStatusRequest: (id: number, status: Request) => void;
  calendarConfig?: BusinessDayCalendarConfig;
}

const TextWithTooltip = memo(
  ({ text, maxLength = 20 }: { text: string; maxLength?: number }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    if (!text) {
      return <span className="text-slate-400">-</span>;
    }

    if (text.length <= maxLength) {
      return <span>{text}</span>;
    }

    const displayText = `${text.substring(0, maxLength)}...`;

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
          className="cursor-help border-b border-dotted border-slate-300 transition-colors duration-200 hover:text-slate-700"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowTooltip(false)}
          title={text}
        >
          {displayText}
        </span>
        {showTooltip && (
          <div
            className="fixed z-[9999] max-w-sm break-words rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
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
  },
);

TextWithTooltip.displayName = "TextWithTooltip";

const StatusBadge = memo(({ meta }: { meta: StatusChipMeta }) => (
  <span
    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold shadow-sm whitespace-nowrap ${meta.chipClass}`}
  >
    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
    {meta.label}
  </span>
));

StatusBadge.displayName = "StatusBadge";

const PriorityChip = memo(({ statusInfo }: { statusInfo: StatusInfo }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-sm ${statusInfo.badgeClass}`}
  >
    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
    {statusInfo.primaryLabel}
  </span>
));

PriorityChip.displayName = "PriorityChip";

export const TableRow = memo(
  ({
    request,
    isAdmin,
    isUser,
    isViewer,
    isSupervisor,
    userWorkCenterId,
    selectedRequests,
    onToggleSelect,
    handleEdit,
    handleDelete,
    handleEditOmsStatus,
    handleEditStatusRequest,
    calendarConfig,
  }: TableRowProps) => {
    const statusInfo = getUrgencyStatus(
      request.outageDate,
      request.omsStatus,
      request.statusRequest,
      calendarConfig,
    );
    const requestStatusMeta = getRequestStatusMeta(request.statusRequest);
    const omsStatusMeta = getOmsStatusMeta(request.omsStatus);
    const showTimelineHint = statusInfo.daysLabel !== statusInfo.primaryLabel;

    const cellClass = "px-4 py-4 align-top leading-tight";
    const selectClass =
      "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-50";

    const formatThaiDate = useCallback((date: Date) => {
      try {
        return date.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return "-";
      }
    }, []);

    const formatThaiTime = useCallback((date: Date) => {
      try {
        return date.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "-";
      }
    }, []);

    const handleOmsStatusChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleEditOmsStatus(request.id, e.target.value as OMSStatus);
      },
      [handleEditOmsStatus, request.id],
    );

    const handleStatusRequestChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleEditStatusRequest(request.id, e.target.value as Request);
      },
      [handleEditStatusRequest, request.id],
    );

    return (
      <tr
        className={`group border-b border-slate-100 transition-colors duration-200 ${statusInfo.borderClass} ${statusInfo.bgClass}`}
      >
        {!isViewer && (
          <td className="w-10 px-4 py-4 align-top">
            <div className="mt-0.5 flex items-center">
              <input
                type="checkbox"
                checked={selectedRequests.includes(request.id)}
                onChange={() => onToggleSelect(request.id)}
                disabled={
                  !(
                    isAdmin ||
                    (isUser && request.workCenter.id === userWorkCenterId)
                  )
                }
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 shadow-sm transition-all focus:ring-blue-500"
              />
            </div>
          </td>
        )}

        <td className={cellClass}>
          <div className="flex max-w-[280px] flex-col gap-2">
            <div className="flex flex-wrap items-start gap-2">
              <span className="text-[15px] font-extrabold leading-none tracking-tight text-slate-900">
                <TextWithTooltip
                  text={request.transformerNumber}
                  maxLength={18}
                />
              </span>
              <PriorityChip statusInfo={statusInfo} />
            </div>
            <div
              className={`inline-flex items-center gap-2 text-[11px] font-semibold ${statusInfo.summaryTextClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
              <span>{statusInfo.secondaryLabel}</span>
            </div>
            <div className="text-[12px] font-medium text-slate-500">
              <TextWithTooltip
                text={request.area || "ไม่ระบุบริเวณ"}
                maxLength={28}
              />
            </div>
          </div>
        </td>

        <td className={cellClass}>
          <div className="flex min-w-[160px] flex-col gap-1.5">
            <div className="flex items-center text-[13px] font-bold text-slate-800">
              <svg
                className={`mr-1.5 h-3.5 w-3.5 ${statusInfo.color === "red" ? "text-red-500" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatThaiDate(request.outageDate)}
            </div>
            <div className="flex items-center text-[12px] font-semibold text-slate-500">
              <svg
                className="mr-1.5 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatThaiTime(request.startTime)} - {formatThaiTime(request.endTime)}
            </div>
            {showTimelineHint && (
              <div className={`text-[11px] font-semibold ${statusInfo.summaryTextClass}`}>
                {statusInfo.daysLabel}
              </div>
            )}
          </div>
        </td>

        {(isAdmin || isViewer) && (
          <td className={cellClass}>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-slate-700">
                {request.workCenter.name}
              </span>
              <span className="self-start rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                {request.branch.shortName}
              </span>
            </div>
          </td>
        )}

        <td className={cellClass}>
          {request.statusRequest === "NOT" ? (
            <select
              value={request.statusRequest}
              onChange={handleStatusRequestChange}
              disabled={
                !(isAdmin || (isUser && request.workCenter.id === userWorkCenterId))
              }
              className={selectClass}
            >
              <option value="NOT">รออนุมัติ</option>
              <option value="CONFIRM">อนุมัติดับไฟ</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>
          ) : (
            <StatusBadge meta={requestStatusMeta} />
          )}
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
            <StatusBadge meta={omsStatusMeta} />
          )}
        </td>

        <td className={cellClass}>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
              <svg
                className="h-3 w-3 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {request.createdBy.fullName}
            </span>
            <span className="ml-4 text-[11px] text-slate-400">
              {formatThaiDate(request.createdAt)}
            </span>
          </div>
        </td>

        {!isViewer && !isSupervisor && (
          <td className="px-4 py-4 align-top text-center">
            <div className="flex items-center justify-center space-x-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
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
      </tr>
    );
  },
);

TableRow.displayName = "TableRow";
