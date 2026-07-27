"use client";

import { memo, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Info,
} from "lucide-react";
import {
  getOmsUrgencyBucketCounts,
  isApprovedPendingOmsRequest,
  OMS_URGENCY_BUCKETS,
} from "@/lib/utils/status-utils";
import type { BusinessDayCalendarConfig } from "@/lib/validations/powerOutageRequest";

interface PowerOutageRequest {
  id: number;
  outageDate: Date;
  omsStatus: string;
  statusRequest: string;
}

interface OMSStatusSummaryProps {
  requests: PowerOutageRequest[];
  filteredRequests: PowerOutageRequest[];
  showFilteredSummary?: boolean;
  calendarConfig?: BusinessDayCalendarConfig;
}

interface SummaryCardProps {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "critical" | "info" | "neutral" | "warning";
}

const toneClasses = {
  critical: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-sky-200 bg-sky-50 text-sky-950",
  neutral: "border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text)]",
};

const SummaryCard = ({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: SummaryCardProps) => (
  <div className={`min-w-0 border-r px-3 py-2.5 last:border-r-0 ${toneClasses[tone]}`}>
    <div className="mb-1 flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/75">
        <Icon className="h-4 w-4" />
      </div>
      <span className="truncate text-xs font-semibold">{title}</span>
    </div>
    <div className="text-2xl font-bold tabular-nums">{value}</div>
    <div className="mt-0.5 truncate text-xs opacity-80">{hint}</div>
  </div>
);

export const OMSStatusSummary = memo(
  ({
    requests,
    filteredRequests,
    showFilteredSummary = true,
    calendarConfig,
  }: OMSStatusSummaryProps) => {
    const summaryData = useMemo(() => {
      const dataSource = showFilteredSummary ? filteredRequests : requests;

      const approvedPendingOms = dataSource.filter(
        isApprovedPendingOmsRequest,
      );
      const pendingApproval = dataSource.filter(
        (req) => req.statusRequest === "NOT",
      );
      const processedItems = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "PROCESSED",
      );
      const cancelledItems = dataSource.filter(
        (req) =>
          req.statusRequest === "CANCELLED" || req.omsStatus === "CANCELLED",
      );

      const urgencyBucketCounts = getOmsUrgencyBucketCounts(
        dataSource,
        undefined,
        calendarConfig,
      );

      return {
        totalItems: dataSource.length,
        approvedPendingOms: approvedPendingOms.length,
        pendingApproval: pendingApproval.length,
        processedItems: processedItems.length,
        cancelledItems: cancelledItems.length,
        urgencyBucketCounts,
        isFiltered:
          showFilteredSummary && filteredRequests.length !== requests.length,
      };
    }, [calendarConfig, filteredRequests, requests, showFilteredSummary]);

    if (showFilteredSummary && filteredRequests.length === 0) {
      return (
        <div className="ui-panel p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-[var(--app-info)]" />
            <h2 className="text-sm font-semibold text-slate-700">
              ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            กรุณาปรับเปลี่ยนเงื่อนไขการค้นหาเพื่อดูข้อมูลสรุป
          </p>
        </div>
      );
    }

    return (
      <section className="ui-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-pea-700" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                สรุปสถานะรวม
              </h2>
              <p className="text-xs text-slate-500">
                แสดงเฉพาะงานที่อนุมัติแล้ว แต่ยังไม่ลง OMS เพื่อช่วยติดตามงานคงค้าง
              </p>
            </div>
          </div>
          <span className="rounded-md bg-[var(--app-frame)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]">
            {summaryData.isFiltered
              ? `แสดง ${filteredRequests.length} จาก ${requests.length} รายการ`
              : `ทั้งหมด ${summaryData.totalItems} รายการ`}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-[var(--app-warning)]" />
            <h3 className="text-sm font-semibold text-slate-800">
              งานคงค้างที่อนุมัติแล้ว แต่ยังไม่ลง OMS
            </h3>
          </div>

          <div className="grid overflow-hidden border-t border-[var(--app-border)] sm:grid-cols-2 xl:grid-cols-5 [&>*]:border-[var(--app-border)]">
            <SummaryCard
              title={OMS_URGENCY_BUCKETS[0].label}
              value={summaryData.urgencyBucketCounts.OVERDUE}
              hint={OMS_URGENCY_BUCKETS[0].hint}
              icon={AlertTriangle}
              tone="critical"
            />
            <SummaryCard
              title={OMS_URGENCY_BUCKETS[1].label}
              value={summaryData.urgencyBucketCounts.WITHIN_3_BUSINESS_DAYS}
              hint={OMS_URGENCY_BUCKETS[1].hint}
              icon={CalendarClock}
              tone="warning"
            />
            <SummaryCard
              title={OMS_URGENCY_BUCKETS[2].label}
              value={summaryData.urgencyBucketCounts.BUSINESS_DAYS_4_TO_7}
              hint={OMS_URGENCY_BUCKETS[2].hint}
              icon={Clock3}
              tone="warning"
            />
            <SummaryCard
              title={OMS_URGENCY_BUCKETS[3].label}
              value={summaryData.urgencyBucketCounts.BUSINESS_DAYS_8_TO_15}
              hint={OMS_URGENCY_BUCKETS[3].hint}
              icon={CalendarCheck2}
              tone="neutral"
            />
            <SummaryCard
              title={OMS_URGENCY_BUCKETS[4].label}
              value={summaryData.urgencyBucketCounts.OVER_15_BUSINESS_DAYS}
              hint={OMS_URGENCY_BUCKETS[4].hint}
              icon={CalendarCheck2}
              tone="info"
            />
          </div>
        </div>
      </section>
    );
  },
);

OMSStatusSummary.displayName = "OMSStatusSummary";
