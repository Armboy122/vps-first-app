"use client";
import Link from "next/link";
import Image from 'next/image';
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // ตรวจสอบว่าเป็น viewer หรือไม่
  const isViewer = session?.user.role === "VIEWER";

  const navItems = [
    { label: "หน้าแรก", path: "/power-outage-requests" },
    { label: "DashBord", path: "/" },
    // แสดงเมนู Profile เฉพาะกรณีที่ไม่ใช่ viewer
    ...(!isViewer ? [{ label: "Profile", path: "/user" }] : []),
    ...(session?.user.role === "ADMIN"
      ? [{ label: "Admin", path: "/admin" }]
      : []),
  ];

  return (
    <nav className="bg-gradient-to-r from-pea-700 to-pea-600 text-white fixed top-0 left-0 right-0 z-50 shadow-pea">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/power-outage-requests" className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={70}
                  height={50}
                  className="mr-2"
                />
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      pathname === item.path
                        ? "bg-pea-800 text-white shadow-md"
                        : "text-pea-100 hover:bg-pea-600 hover:text-white hover:shadow-md"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {session ? (
                <div className="flex items-center">
                  <span className="text-sm mr-4">
                    สวัสดี, {session.user?.name}!
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="bg-pea-accent-500 hover:bg-pea-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                >
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-pea-200 hover:text-white hover:bg-pea-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pea-700 focus:ring-white transition-all duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg
                  className="inline-flex h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="inline-flex h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                  pathname === item.path
                    ? "bg-pea-800 text-white"
                    : "text-pea-100 hover:bg-pea-600 hover:text-white"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-pea-500">
            {session ? (
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <span className="text-sm">สวัสดี, {session.user?.name}!</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="ml-auto bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="px-5">
                <button
                  onClick={() => signIn()}
                  className="block w-full bg-pea-accent-500 hover:bg-pea-accent-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
