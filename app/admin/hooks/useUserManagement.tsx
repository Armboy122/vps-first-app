import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/app/api/action/User";
import { useAdminContext } from "../context/AdminContext";

/**
 * Custom hook สำหรับจัดการข้อมูลผู้ใช้ในหน้า Admin
 */
export function useUserManagement() {
  const { searchParams } = useAdminContext();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", searchParams],
    queryFn: () =>
      getUsers(
        searchParams.page,
        searchParams.limit,
        searchParams.search,
        searchParams.workCenterId,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const users = data?.users || [];
  const totalUsers = data?.totalUsers || 0;
  const totalPages = data?.totalPages || 0;

  return {
    users,
    totalUsers,
    totalPages,
    isLoading,
    error,
    refetch,
  };
}