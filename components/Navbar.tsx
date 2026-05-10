"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentRole = session?.user.role ?? "GUEST";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navItems = useMemo(
    () => [
      { label: "หน้าแรก", path: "/power-outage-requests" },
      ...(currentRole !== "VIEWER" ? [{ label: "Profile", path: "/user" }] : []),
      ...(currentRole === "ADMIN" ? [{ label: "Admin", path: "/admin" }] : []),
    ],
    [currentRole],
  );

  const isActivePath = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/60 bg-white/80 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link
            href="/power-outage-requests"
            className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 transition-colors hover:bg-slate-900/5"
          >
            <Image
              src="/peatransformer-logo.png"
              alt="PeaTransformer logo"
              width={56}
              height={40}
              className="h-10 w-auto rounded-xl"
              priority
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pea-700">
                PeaTransformer
              </p>
              <p className="truncate text-[15px] font-semibold text-slate-900">
                ระบบจัดการคำขอดับไฟ
              </p>
            </div>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-2">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-[15px] font-medium transition-all duration-200 ${
                    active
                      ? "bg-pea-700 text-white shadow-md shadow-pea-700/20"
                      : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm lg:flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">สวัสดี,</span>
                  <span className="font-semibold text-slate-900">
                    {session.user?.name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {currentRole}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="rounded-full bg-pea-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pea-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen((value) => !value)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2 md:hidden"
          >
            <span className="sr-only">{isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}</span>
            {!isMenuOpen ? (
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav-menu" className="border-t border-slate-200/80 bg-white/95 px-4 pb-4 pt-3 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                    active
                      ? "bg-pea-50 text-pea-800"
                      : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">สวัสดี</p>
                    <p className="truncate font-semibold text-slate-900">
                      {session.user?.name}
                    </p>
                    <p className="text-sm uppercase tracking-[0.14em] text-slate-600">
                      {currentRole}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="w-full rounded-full bg-pea-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pea-800"
                >
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
