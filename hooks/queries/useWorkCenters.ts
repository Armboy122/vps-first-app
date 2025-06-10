import { useQuery } from '@tanstack/react-query';
import { getWorkCenters } from '@/app/api/action/getWorkCentersAndBranches';

/**
 * Hook สำหรับดึงข้อมูล Work Centers ทั้งหมด
 */
export const useWorkCenters = () => {
  return useQuery({
    queryKey: ['workCenters'],
    queryFn: getWorkCenters,
    staleTime: 10 * 60 * 1000, // 10 นาที
    retry: 2,
  });
};
