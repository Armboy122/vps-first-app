"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/th";

// ตั้งค่า dayjs เป็นภาษาไทย
dayjs.locale('th');

const theme = createTheme({
  // สามารถกำหนด theme เพิ่มเติมได้ที่นี่
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MantineProvider theme={theme}>
          <DatesProvider 
            settings={{
              locale: 'th',
              firstDayOfWeek: 0,
              weekendDays: [0, 6]
            }}
          >
            {children}
          </DatesProvider>
        </MantineProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
