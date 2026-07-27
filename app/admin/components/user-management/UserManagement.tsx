import { UserSearchBar } from "./UserSearchBar";
import { UserTable } from "./UserTable";

export function UserManagement() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-text)]">จัดการผู้ใช้งาน</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            จัดการข้อมูลผู้ใช้ สิทธิ์การเข้าถึง และการตั้งค่าบัญชี
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <UserSearchBar />

      {/* User Table */}
      <UserTable />
    </div>
  );
}
