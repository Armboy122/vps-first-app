"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Home, LogIn, LogOut, Menu, Settings, UserRound, X } from "lucide-react";

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
      { icon: Home, label: "รายการงาน", path: "/power-outage-requests" },
      ...(currentRole !== "VIEWER"
        ? [{ icon: UserRound, label: "ข้อมูลส่วนตัว", path: "/user" }]
        : []),
      ...(currentRole === "ADMIN"
        ? [{ icon: Settings, label: "จัดการระบบ", path: "/admin" }]
        : []),
    ],
    [currentRole],
  );

  const isActivePath = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--app-border)] bg-white text-[var(--app-text)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/power-outage-requests"
            className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-2 transition-colors hover:bg-[var(--app-surface-subtle)]"
          >
            <Image
              src="/peatransformer-logo.png"
              alt="PeaTransformer logo"
              width={42}
              height={32}
              className="h-8 w-auto"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pea-700">
                PeaTransformer
              </p>
              <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                ระบบจัดการคำขอดับไฟ
              </p>
            </div>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                    active
                      ? "bg-pea-100 text-pea-900"
                      : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
                  }`}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              <>
                <div className="hidden items-center gap-2 border-l border-[var(--app-border)] pl-3 text-sm lg:flex">
                  <span className="font-semibold text-[var(--app-text)]">
                    {session.user?.name}
                  </span>
                  <span className="rounded-md bg-[var(--app-frame)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-muted)]">
                    {currentRole}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--app-text-body)] transition-colors hover:bg-[var(--app-surface-subtle)]"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pea-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pea-800"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                เข้าสู่ระบบ
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen((value) => !value)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--app-border)] bg-white text-[var(--app-text-body)] transition-colors hover:bg-[var(--app-surface-subtle)] md:hidden"
          >
            <span className="sr-only">{isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}</span>
            {!isMenuOpen ? (
              <Menu className="h-5 w-5" aria-hidden="true" />
            ) : (
              <X className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav-menu" className="border-t border-[var(--app-border)] bg-white px-4 pb-4 pt-3 shadow-[var(--app-shadow-raised)] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                    active
                      ? "bg-pea-100 text-pea-900"
                      : "text-[var(--app-text-body)] hover:bg-[var(--app-surface-subtle)]"
                  }`}
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-4 py-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--app-text-muted)]">ผู้ใช้งาน</p>
                    <p className="truncate font-semibold text-[var(--app-text)]">
                      {session.user?.name}
                    </p>
                    <p className="text-sm uppercase tracking-[0.14em] text-slate-600">
                      {currentRole}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--app-text-body)]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pea-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pea-800"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
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
