import Link from "next/link";
import { Settings, UserPlus } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="mb-5 border-b border-[var(--app-border)] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pea-100 text-pea-800">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[var(--app-text)]">จัดการระบบ</h1>
              <p className="text-xs text-[var(--app-text-muted)]">ผู้ใช้ หม้อแปลง ปฏิทิน และข้อมูลส่งออก</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/create-user"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pea-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pea-800"
            >
              <UserPlus className="h-4 w-4" />
              เพิ่มผู้ใช้
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
