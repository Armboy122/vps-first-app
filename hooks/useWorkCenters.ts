import { useQuery } from '@tanstack/react-query';
import { getWorkCenters } from '@/app/api/action/getWorkCentersAndBranches';

export interface WorkCenter {
  id: number;
  name: string;
}

export function useWorkCenters() {
  return useQuery<WorkCenter[], Error>({
    queryKey: ['workCenters'],
    queryFn: async () => {
      const data = await getWorkCenters();
      return data as WorkCenter[];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 ชั่วโมง
  });
} 