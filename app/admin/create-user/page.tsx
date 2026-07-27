import CreateUserForm from "@/components/CreateUserForm";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function CreateUserPage() {
  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <header className="mb-5 border-b border-[var(--app-border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--app-text)]">
                <UserPlus className="h-6 w-6 text-pea-700" />
                เพิ่มผู้ใช้
              </h1>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                ระบุข้อมูลบัญชี หน่วยงาน และสิทธิ์การใช้งาน
              </p>
            </div>
            <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-[var(--app-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--app-text-body)] hover:bg-[var(--app-frame)]">
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าจัดการระบบ
            </Link>
          </div>
        </header>

        <div className="ui-panel p-5 sm:p-7">
          <CreateUserForm />
        </div>
      </div>
    </div>
  );
}
