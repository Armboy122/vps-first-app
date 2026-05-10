import PowerOutageRequestList from "@/components/PowerOutageRequestList";
import { CalendarDays, Zap } from "lucide-react";

export default function PowerOutageRequestPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 shadow-sm">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pea-700">
                  Outage Operations
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  รายการคำขอดับไฟ
                </h1>
                <p className="mt-1 text-[15px] text-slate-600">
                  ติดตามสถานะงานคงค้าง งานที่อนุมัติแล้ว และความคืบหน้าการลง
                  OMS ในมุมมองเดียว
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-center">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="font-medium">มุมมองงานรายวัน</span>
            </div>
          </div>
        </div>

        <PowerOutageRequestList />
      </div>
    </div>
  );
}
