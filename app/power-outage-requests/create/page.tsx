import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import PowerOutageCreatePage from "./components/PowerOutageCreatePage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOption";
import { redirect } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        <header className="mb-5 flex flex-col gap-3 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pea-100 text-pea-800">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[var(--app-text)]">สร้างคำขอดับไฟ</h1>
              <p className="text-sm text-[var(--app-text-muted)]">กรอกข้อมูลตามลำดับและตรวจทานก่อนบันทึก</p>
            </div>
          </div>
          <Link href="/power-outage-requests" className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-[var(--app-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--app-text-body)] hover:bg-[var(--app-frame)]">
            <ArrowLeft className="h-4 w-4" /> กลับรายการงาน
          </Link>
        </header>
        <div>
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
