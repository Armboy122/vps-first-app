"use client";
import { AlertTriangle, Clock, CalendarClock, CalendarCheck2, BarChart3, Info } from "lucide-react";
import { useMemo, memo } from "react";
import { getThailandDateAtMidnight } from "@/lib/date-utils";

interface PowerOutageRequest {
  id: number;
  outageDate: Date;
  omsStatus: string;
  statusRequest: string;
}

interface OMSStatusSummaryProps {
  requests: PowerOutageRequest[];
  filteredRequests: PowerOutageRequest[]; // เพิ่ม prop สำหรับข้อมูลที่ถูกกรองแล้ว
  showFilteredSummary?: boolean; // flag กำหนดว่าจะแสดง summary ตามการกรองหรือไม่
}

export const OMSStatusSummary = memo(
  ({
    requests,
    filteredRequests,
    showFilteredSummary = true, // ค่าเริ่มต้นคือแสดงผลตามการกรอง
  }: OMSStatusSummaryProps) => {
    // คำนวณข้อมูลสรุปจากข้อมูลคำขอที่ได้รับ
    const summaryData = useMemo(() => {
      // เลือกใช้ข้อมูลตาม flag showFilteredSummary
      const dataSource = showFilteredSummary ? filteredRequests : requests;

      // ค่า default: สถานะคำขอ = อนุมัติ (CONFIRM) สถานะ OMS = ยังไม่ได้เพิ่ม (NOT_ADDED)
      const defaultFilter = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "NOT_ADDED",
      );

      const today = getThailandDateAtMidnight();

      // รายการที่เลยวันดับไฟไปแล้ว และยังไม่ได้ดำเนินการ
      const overdue = defaultFilter.filter(
        (req) => new Date(req.outageDate) < today,
      );

      // รายการที่ต้องดำเนินการภายใน 5 วัน
      const urgentItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      });

      // รายการที่ต้องดำเนินการภายใน 6-7 วัน
      const mediumUrgentItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 6 && diffDays <= 7;
      });

      // รายการที่ต้องดำเนินการภายใน 8-15 วัน
      const normalItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 8 && diffDays <= 15;
      });

      // รายการที่ต้องดำเนินการมากกว่า 15 วัน
      const futureitems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 15;
      });

      // รายการที่ดำเนินการแล้ว
      const processedItems = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "PROCESSED",
      );

      // รายการที่ยกเลิกแล้ว
      const cancelledItems = dataSource.filter(
        (req) =>
          req.omsStatus === "CANCELLED" || req.statusRequest === "CANCELLED",
      );

      return {
        defaultItems: defaultFilter.length,
        overdue: overdue.length,
        urgentItems: urgentItems.length,
        mediumUrgentItems: mediumUrgentItems.length,
        normalItems: normalItems.length,
        futureitems: futureitems.length,
        processedItems: processedItems.length,
        cancelledItems: cancelledItems.length,
        totalItems: dataSource.length,
        isFiltered:
          showFilteredSummary && filteredRequests.length !== requests.length, // เพิ่มสถานะว่ามีการกรองหรือไม่
      };
    }, [requests, filteredRequests, showFilteredSummary]);

    // ถ้ากรองแล้วไม่มีข้อมูล ไม่ต้องแสดง summary
    if (showFilteredSummary && filteredRequests.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-500" />
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
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">
              สรุปสถานะ OMS
            </h2>
          </div>
          {summaryData.isFiltered && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
              กรองแล้ว {filteredRequests.length} รายการ
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* เร่งด่วน */}
          <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 p-4 ring-1 ring-red-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-red-700">เร่งด่วน</span>
            </div>
            <div className="text-2xl font-bold text-red-900">
              {summaryData.urgentItems}
            </div>
            <div className="text-xs text-red-600 mt-0.5">0-5 วัน</div>
          </div>

          {/* ปานกลาง */}
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 ring-1 ring-amber-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-amber-700">ปานกลาง</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">
              {summaryData.mediumUrgentItems}
            </div>
            <div className="text-xs text-amber-600 mt-0.5">6-7 วัน</div>
          </div>

          {/* ปกติ */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 ring-1 ring-emerald-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10">
                <CalendarClock className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-700">ปกติ</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {summaryData.normalItems}
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">8-15 วัน</div>
          </div>

          {/* อนาคต */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 ring-1 ring-blue-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10">
                <CalendarCheck2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-700">อนาคต</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {summaryData.futureitems}
            </div>
            <div className="text-xs text-blue-600 mt-0.5">&gt;15 วัน</div>
          </div>
        </div>
      </div>
    );
  },
);

OMSStatusSummary.displayName = "OMSStatusSummary";
