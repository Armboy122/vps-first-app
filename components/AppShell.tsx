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

      <main className={`relative z-10 flex-grow ${hideChrome ? "" : "pt-16"}`}>
        {children}
      </main>

      {!hideChrome && (
        <footer className="relative z-10 border-t border-[var(--app-border)] bg-white text-center text-sm text-[var(--app-text-muted)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="font-medium">ระบบจัดการคำขอดับไฟ</p>
            <p>&copy; 2024-2026 PeaTransformer</p>
          </div>
        </footer>
      )}
    </>
  );
}
