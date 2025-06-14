import { useQuery } from "@tanstack/react-query";
import { getTransformers } from "@/app/api/action/User";
import { useAdminContext } from "../context/AdminContext";

/**
 * Custom hook สำหรับจัดการข้อมูลหม้อแปลงในหน้า Admin
 */
export function useTransformerManagement() {
  const { transformerSearchParams } = useAdminContext();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transformers", transformerSearchParams],
    queryFn: () =>
      getTransformers(
        transformerSearchParams.page,
        transformerSearchParams.limit,
        transformerSearchParams.search,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const transformers = data?.transformers || [];
  const totalTransformers = data?.totalTransformers || 0;
  const totalPages = data?.totalPages || 0;

  return {
    transformers,
    totalTransformers,
    totalPages,
    isLoading,
    error,
    refetch,
  };
}