import PowerOutageRequestList from "@/components/PowerOutageRequestList";
import { CalendarDays, Zap } from "lucide-react";

export default function PowerOutageRequestPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 border-b border-[var(--app-border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pea-100">
                <Zap className="h-5 w-5 text-pea-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--app-text)] sm:text-2xl">
                  รายการคำขอดับไฟ
                </h1>
                <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">
                  ติดตามงานอนุมัติ งานคงค้าง และสถานะ OMS
                </p>
              </div>
            </div>

            <div className="flex min-h-10 items-center gap-2 self-start rounded-lg border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-text-muted)] sm:self-center">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="font-medium">มุมมองงานรายวัน</span>
            </div>
          </div>
        </header>

        <PowerOutageRequestList />
      </div>
    </div>
  );
}
