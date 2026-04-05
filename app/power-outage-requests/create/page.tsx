import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import PowerOutageCreatePage from "./components/PowerOutageCreatePage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOption";
import { redirect } from "next/navigation";
import { Zap, ChevronRight, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreatePowerOutageRequestPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  const { role, branchId, workCenterId } = session.user;

  let workCenters;
  if (role === "ADMIN") {
    workCenters = await getWorkCenters();
  }

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
            <Link href="/power-outage-requests" className="hover:text-white transition-colors">
              รายการคำขอดับไฟ
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">สร้างคำขอใหม่</span>
          </nav>

          {/* Title section */}
          <div className="flex items-center justify-between pb-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  สร้างคำขอดับไฟใหม่
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {role === "ADMIN" ? "สร้างคำขอในฐานะผู้ดูแลระบบ" : "กรอกข้อมูลเพื่อยื่นคำขอดับไฟ"}
                </p>
              </div>
            </div>
            <Link
              href="/power-outage-requests"
              className="hidden sm:inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้ารายการ
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <PowerOutageCreatePage
            role={role}
            workCenterId={String(workCenterId)}
            branch={String(branchId)}
            workCenters={role === "ADMIN" ? workCenters : undefined}
          />
        </div>
      </div>
    </div>
  );
}
