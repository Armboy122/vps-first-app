import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import PowerOutageRequestForm from "@/components/PowerOutageRequestForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOption";
import { redirect } from "next/navigation";

export default async function CreatePowerOutageRequestPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  const { role, branchId, workCenterId } = session.user;
  
  let workCenters;
  if (role === 'ADMIN') {
    workCenters = await getWorkCenters();
  }

  console.log("workCenters and role", workCenters, role);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-blue-600">
            <h1 className="text-2xl font-bold text-white">สร้างคำขอดับไฟใหม่</h1>
          </div>
          <div className="p-6">
            <PowerOutageRequestForm 
              role={role}
              workCenterId={String(workCenterId)}
              branch={String(branchId)}
              workCenters={role === 'ADMIN' ? workCenters : undefined}
            />
          </div>
        </div>
        {role === 'ADMIN' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              คุณกำลังสร้างคำขอในฐานะผู้ดูแลระบบ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}