import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import PowerOutageRequestForm from "@/components/PowerOutageRequestForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">สร้างคำขอดับไฟใหม่</h1>
      <PowerOutageRequestForm 
        role={role}
        workCenterId={String(workCenterId)}
        branch={String(branchId)}
        workCenters={role === 'ADMIN' ? workCenters : undefined}
      />
    </div>
  );
}