import PowerOutageRequestList from "@/components/PowerOutageRequestList";
import { Zap, ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export default function PowerOutageRequestPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modern gradient header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 pt-4 pb-2 text-sm text-slate-400">
            <Link href="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>หน้าหลัก</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">รายการคำขอดับไฟ</span>
          </nav>

          {/* Title section */}
          <div className="flex items-center justify-between pb-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  รายการคำขอดับไฟ
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  จัดการและติดตามสถานะคำขอดับไฟทั้งหมด
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PowerOutageRequestList />
      </div>
    </div>
  );
}
