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
import { getThailandDateAtMidnight } from "@/lib/date-utils";

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
}

interface SummaryCardProps {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

const SummaryCard = ({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: SummaryCardProps) => (
  <div className={`rounded-xl p-4 ring-1 ${tone}`}>
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold">{title}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="mt-0.5 text-xs opacity-80">{hint}</div>
  </div>
);

export const OMSStatusSummary = memo(
  ({
    requests,
    filteredRequests,
    showFilteredSummary = true,
  }: OMSStatusSummaryProps) => {
    const summaryData = useMemo(() => {
      const dataSource = showFilteredSummary ? filteredRequests : requests;
      const today = getThailandDateAtMidnight();

      const approvedPendingOms = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "NOT_ADDED",
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

      const overdue = approvedPendingOms.filter(
        (req) => new Date(req.outageDate) < today,
      );
      const urgentItems = approvedPendingOms.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
      });
      const mediumUrgentItems = approvedPendingOms.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 4 && diffDays <= 7;
      });
      const normalItems = approvedPendingOms.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 8 && diffDays <= 15;
      });
      const futureItems = approvedPendingOms.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 15;
      });

      return {
        totalItems: dataSource.length,
        approvedPendingOms: approvedPendingOms.length,
        pendingApproval: pendingApproval.length,
        processedItems: processedItems.length,
        cancelledItems: cancelledItems.length,
        overdue: overdue.length,
        urgentItems: urgentItems.length,
        mediumUrgentItems: mediumUrgentItems.length,
        normalItems: normalItems.length,
        futureItems: futureItems.length,
        isFiltered:
          showFilteredSummary && filteredRequests.length !== requests.length,
      };
    }, [filteredRequests, requests, showFilteredSummary]);

    if (showFilteredSummary && filteredRequests.length === 0) {
      return (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
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
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                สรุปสถานะรวม
              </h2>
              <p className="text-xs text-slate-500">
                แสดงเฉพาะงานที่อนุมัติแล้ว แต่ยังไม่ลง OMS เพื่อช่วยติดตามงานคงค้าง
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {summaryData.isFiltered
              ? `แสดง ${filteredRequests.length} จาก ${requests.length} รายการ`
              : `ทั้งหมด ${summaryData.totalItems} รายการ`}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              งานคงค้างที่อนุมัติแล้ว แต่ยังไม่ลง OMS
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <SummaryCard
              title="เลยกำหนด"
              value={summaryData.overdue}
              hint="ต้องรีบติดตาม"
              icon={AlertTriangle}
              tone="bg-red-50 text-red-900 ring-red-200/70"
            />
            <SummaryCard
              title="ภายใน 3 วัน"
              value={summaryData.urgentItems}
              hint="งานเร่งด่วน"
              icon={CalendarClock}
              tone="bg-orange-50 text-orange-900 ring-orange-200/70"
            />
            <SummaryCard
              title="4-7 วัน"
              value={summaryData.mediumUrgentItems}
              hint="ควรเริ่มติดตาม"
              icon={Clock3}
              tone="bg-amber-50 text-amber-900 ring-amber-200/70"
            />
            <SummaryCard
              title="8-15 วัน"
              value={summaryData.normalItems}
              hint="อยู่ในช่วงปกติ"
              icon={CalendarCheck2}
              tone="bg-emerald-50 text-emerald-900 ring-emerald-200/70"
            />
            <SummaryCard
              title="มากกว่า 15 วัน"
              value={summaryData.futureItems}
              hint="ยังไม่เร่งด่วน"
              icon={CalendarCheck2}
              tone="bg-blue-50 text-blue-900 ring-blue-200/70"
            />
          </div>
        </div>
      </div>
    );
  },
);

OMSStatusSummary.displayName = "OMSStatusSummary";
