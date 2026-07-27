import { useQuery } from "@tanstack/react-query";
import { useAdminContext } from "../../context/AdminContext";
import { getUsers } from "@/app/api/action/User";
import { User } from "../../types/admin.types";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorMessage } from "../shared/ErrorMessage";
import { UserRow } from "./UserRow";
import { UserPagination } from "./UserPagination";
import { PageSizeSelector } from "../shared/PageSizeSelector";
import { UserRound } from "lucide-react";

interface UsersResponse {
  users: User[];
  totalUsers: number;
  totalPages: number;
}

export function UserTable() {
  const { searchParams, updateSearchParams } = useAdminContext();

  // Fetch users with React Query - use stable key structure
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "users", 
      searchParams.page, 
      searchParams.limit, 
      searchParams.search, 
      searchParams.workCenterId
    ],
    queryFn: () =>
      getUsers(
        searchParams.page,
        searchParams.limit,
        searchParams.search,
        searchParams.workCenterId,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    // ป้องกัน refetch ที่ไม่จำเป็น
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    updateSearchParams({ limit: newLimit, page: 1 });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="ui-panel">
        <div className="p-8">
          <LoadingSpinner size="lg" text="กำลังโหลดข้อมูลผู้ใช้..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ui-panel">
        <div className="p-6">
          <ErrorMessage
            message="ไม่สามารถโหลดข้อมูลผู้ใช้ได้"
            retry={refetch}
          />
        </div>
      </div>
    );
  }

  const { users = [], totalUsers = 0, totalPages = 0 } = data || {};

  return (
    <div className="ui-panel overflow-hidden">
      {/* Table Header with Page Size Selector */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            รายชื่อผู้ใช้งาน
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            จัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง
          </p>
        </div>
        
        <PageSizeSelector
          value={searchParams.limit}
          onChange={handlePageSizeChange}
        />
      </div>

      {/* Table Content */}
      {users.length === 0 ? (
        <div className="p-8 text-center">
          <UserRound className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ไม่พบข้อมูลผู้ใช้
          </h3>
          <p className="text-gray-600">
            {searchParams.search || searchParams.workCenterId
              ? "ลองเปลี่ยนเงื่อนไขการค้นหา หรือล้างตัวกรอง"
              : "ยังไม่มีผู้ใช้ในระบบ"}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-surface-subtle)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ข้อมูลผู้ใช้
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    บทบาท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    หน่วยงาน
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)] bg-white">
                {users.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <UserPagination totalUsers={totalUsers} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
