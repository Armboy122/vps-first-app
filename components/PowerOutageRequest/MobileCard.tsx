"use client";

import { useCallback, useState } from "react";
import { OMSStatus, Request } from "@prisma/client";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
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

interface MobileCardProps {
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

const StatusBadge = ({ meta }: { meta: StatusChipMeta }) => (
  <span
    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta.chipClass}`}
  >
    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
    {meta.label}
  </span>
);

const PriorityChip = ({ statusInfo }: { statusInfo: StatusInfo }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusInfo.badgeClass}`}
  >
    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
    {statusInfo.primaryLabel}
  </span>
);

export const MobileCard: React.FC<MobileCardProps> = ({
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
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getUrgencyStatus(
    request.outageDate,
    request.omsStatus,
    request.statusRequest,
    calendarConfig,
  );
  const requestStatusMeta = getRequestStatusMeta(request.statusRequest);
  const omsStatusMeta = getOmsStatusMeta(request.omsStatus);
  const showTimelineHint = statusInfo.daysLabel !== statusInfo.primaryLabel;

  const canEdit =
    isAdmin ||
    (isUser && request.workCenter.id === userWorkCenterId && !isViewer);

  const formatThaiDate = useCallback((date: Date) => {
    try {
      return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
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

  return (
    <div
      className={`mb-3 overflow-hidden rounded-xl border border-[var(--app-border)] transition-colors duration-150 ${statusInfo.borderClass} ${statusInfo.bgClass}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {!isViewer && (
                <input
                  type="checkbox"
                  checked={selectedRequests.includes(request.id)}
                  onChange={() => onToggleSelect(request.id)}
                  disabled={
                    !(isAdmin || (isUser && request.workCenter.id === userWorkCenterId))
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-pea-700 focus:ring-pea-600"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="truncate text-[17px] font-extrabold tracking-tight text-slate-900">
                    {request.transformerNumber}
                  </h3>
                  <PriorityChip statusInfo={statusInfo} />
                </div>
                <div
                  className={`mt-2 inline-flex items-center gap-2 text-[11px] font-semibold ${statusInfo.summaryTextClass}`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                  <span>{statusInfo.secondaryLabel}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center text-[14px] font-bold text-slate-800">
                  <CalendarDays className={`mr-2 h-4 w-4 ${statusInfo.color === "red" ? "text-red-600" : "text-slate-500"}`} />
                  <span className="truncate">{formatThaiDate(request.outageDate)}</span>
                </div>
                <div className="flex shrink-0 items-center text-[13px] font-semibold text-slate-500">
                  <Clock3 className="mr-2 h-4 w-4 text-slate-500" />
                  {formatThaiTime(request.startTime)} - {formatThaiTime(request.endTime)}
                </div>
              </div>

              {showTimelineHint && (
                <div className={`text-[11px] font-semibold ${statusInfo.summaryTextClass}`}>
                  {statusInfo.daysLabel}
                </div>
              )}

              <div className="flex items-center rounded-lg border border-slate-100 bg-white/70 p-2 text-[13px] font-medium text-slate-500">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-slate-500" />
                <span className="truncate">{request.area || "ไม่ระบุบริเวณ"}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge meta={requestStatusMeta} />
              <StatusBadge meta={omsStatusMeta} />
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] bg-white text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-frame)]"
            aria-label={expanded ? "ย่อ" : "ขยาย"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-white/70 p-3">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  หน่วยงาน
                </span>
                <p className="text-[13px] font-bold leading-tight text-slate-800">
                  {request.workCenter.name}
                </p>
                <p className="mt-1 inline-block rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                  {request.branch.shortName}
                </p>
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ผู้สร้างคำขอ
                </span>
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
                  <UserRound className="h-3.5 w-3.5 text-slate-500" />
                  {request.createdBy.fullName}
                </p>
                <p className="mt-1 ml-4 text-[10px] text-slate-400">
                  {formatThaiDate(request.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(isAdmin || isSupervisor) && request.omsStatus === "NOT_ADDED" && (
                <div>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ปรับสถานะ OMS
                  </span>
                  <select
                    value={request.omsStatus}
                    onChange={(e) =>
                      handleEditOmsStatus(request.id, e.target.value as OMSStatus)
                    }
                    className="ui-input block w-full px-3 py-2.5 text-xs font-bold"
                  >
                    <option value="NOT_ADDED">ยังไม่ดำเนินการ</option>
                    <option value="PROCESSED">ดำเนินการแล้ว</option>
                    <option value="CANCELLED">ยกเลิก</option>
                  </select>
                </div>
              )}

              {(isAdmin || (isUser && request.workCenter.id === userWorkCenterId)) &&
                request.statusRequest === "NOT" && (
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ปรับสถานะอนุมัติ
                    </span>
                    <select
                      value={request.statusRequest}
                      onChange={(e) =>
                        handleEditStatusRequest(request.id, e.target.value as Request)
                      }
                      className="ui-input block w-full px-3 py-2.5 text-xs font-bold"
                    >
                      <option value="NOT">รออนุมัติ</option>
                      <option value="CONFIRM">อนุมัติดับไฟ</option>
                      <option value="CANCELLED">ยกเลิก</option>
                    </select>
                  </div>
                )}
            </div>

            {canEdit && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleEdit(request)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-white px-4 py-2.5 text-[12px] font-bold text-[var(--app-text-body)] transition-colors hover:bg-[var(--app-frame)]"
                >
                  <Pencil className="h-4 w-4" />
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => handleDelete(request.id)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบคำขอ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
