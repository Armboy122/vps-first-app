// components/AuthWrapper.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return; // ยังโหลดอยู่ รอก่อน

    // ถ้าไม่มี session และไม่ได้อยู่ในหน้า login แล้ว ให้ redirect ไปหน้า login
    if (!session && pathname !== "/login") {
      router.push("/login");
    }
  }, [session, status, router, pathname]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  // ถ้ามี session หรืออยู่ในหน้า login แล้ว ให้แสดงเนื้อหา
  return (session || pathname === "/login") ? <>{children}</> : null;
}