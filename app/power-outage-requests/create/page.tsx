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
