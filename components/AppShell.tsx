"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

const chromeHiddenRoutes = ["/login"];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideChrome = useMemo(
    () => chromeHiddenRoutes.some((route) => pathname === route),
    [pathname],
  );

  return (
    <>
      {!hideChrome && <Navbar />}

      <main className={`relative z-10 flex-grow ${hideChrome ? "" : "pt-20"}`}>
        {children}
      </main>

      {!hideChrome && (
        <footer className="relative z-10 border-t border-slate-200/80 bg-white/70 text-center text-sm text-slate-500 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <p className="font-medium text-slate-600">ระบบจัดการคำขอดับไฟ</p>
            <p>&copy; 2024-2026 PeaTransformer</p>
          </div>
        </footer>
      )}
    </>
  );
}
