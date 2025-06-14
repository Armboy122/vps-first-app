import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";

/**
 * Hook สำหรับดึงข้อมูลสาขาตาม Work Center ID
 */
export const useBranches = (workCenterId: number | null) => {
  return useQuery({
    queryKey: ["branches", workCenterId],
    queryFn: () => {
      if (!workCenterId) return [];
      return getBranches(workCenterId);
    },
    enabled: !!workCenterId,
    staleTime: 5 * 60 * 1000, // 5 นาที
    retry: 2,
  });
};
