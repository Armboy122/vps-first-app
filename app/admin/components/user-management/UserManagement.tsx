import { UserSearchBar } from "./UserSearchBar";
import { UserTable } from "./UserTable";

export function UserManagement() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h2>
          <p className="text-gray-600 mt-1">
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