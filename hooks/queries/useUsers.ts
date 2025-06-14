import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, checkEmployeeIdExists } from "@/app/api/action/User";
import { CreateUserSchema } from "@/lib/validations/user";
import { z } from "zod";

type CreateUserData = z.infer<typeof CreateUserSchema>;

/**
 * Hook สำหรับสร้างผู้ใช้ใหม่
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => createUser(data),
    onSuccess: () => {
      // Invalidate users list query if exists
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

/**
 * Hook สำหรับตรวจสอบรหัสพนักงานซ้ำ
 */
export const useCheckEmployeeId = (employeeId: string) => {
  return useQuery({
    queryKey: ["checkEmployeeId", employeeId],
    queryFn: () => checkEmployeeIdExists(employeeId),
    enabled: !!employeeId && employeeId.length >= 6,
    staleTime: 30 * 1000, // 30 วินาที
    retry: 1,
  });
};