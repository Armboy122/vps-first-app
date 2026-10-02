import { useQuery } from "@tanstack/react-query";
import { searchTransformers } from "@/lib/api/client";

/**
 * Hook สำหรับค้นหาหม้อแปลง
 */
export const useTransformers = (searchTerm: string) => {
  return useQuery({
    queryKey: ["transformers", searchTerm],
    queryFn: () => searchTransformers(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 นาที
    retry: 1,
  });
};
