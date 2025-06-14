"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Provider สำหรับ React Query
 * จัดการ caching และ state management สำหรับ API calls
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache เป็นเวลา 5 นาที
            staleTime: 5 * 60 * 1000,
            // Retry 2 ครั้งถ้า error
            retry: 2,
            // ไม่ fetch ซ้ำเมื่อ window focus
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev tools สำหรับ development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};
