// app/page.tsx
import OMSStatusStackedChart from "@/components/Dashbord/OMSStatusStackedChart";
import RequestStatusPieChart from "@/components/Dashbord/RequestStatusPieChart";

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/power-outage-requests");
    }
  }, [status, router]);

  return (
    <div>

    </div>
  );
}