"use client";

/**
 * UI System Decision
 * ------------------
 * Primary UI framework: Mantine v8 + Tailwind CSS
 *
 * Rationale:
 *  - Mantine provides a rich, accessible Thai-locale-aware component library
 *    (Modal, Button, TextInput, Select, DatePicker, Loader, etc.) that
 *    integrates tightly with react-hook-form and TanStack Query.
 *  - Tailwind is used for layout, spacing, and one-off utilities that fall
 *    outside Mantine's component scope.
 *  - MUI (@mui/material, @mui/x-date-pickers) MUST NOT be introduced into
 *    shared components (components/ui/, components/forms/, Navbar, Providers,
 *    etc.).  Any remaining MUI usage lives only in feature-specific components
 *    that have not yet been migrated, and should be phased out over time.
 */

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/th";

// ---- Dayjs global locale (Thai) ----
dayjs.locale("th");

// ---- Mantine theme ----
// Extend here as the design system grows (colors, fonts, component defaults).
const theme = createTheme({
  primaryColor: "pea",
  defaultRadius: "md",
  fontFamily:
    "var(--font-sans), 'IBM Plex Sans Thai', 'Noto Sans Thai', sans-serif",
  headings: {
    fontFamily: "var(--font-display), 'Noto Serif Thai', serif",
    fontWeight: "700",
  },
  colors: {
    pea: [
      "#e8f4ef",
      "#d2e9dd",
      "#aad2bc",
      "#82bc98",
      "#5da678",
      "#3d8d59",
      "#245d42",
      "#1e4c36",
      "#17392a",
      "#10271d",
    ],
  },
});

// ---- Root provider tree ----
// Order: data-fetching → auth → UI theming → date locale → app
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    // 1. TanStack Query – server state management
    <QueryClientProvider client={queryClient}>
      {/* 2. NextAuth – authentication session */}
      <SessionProvider>
        {/* 3. Mantine – primary UI component library */}
        <MantineProvider theme={theme}>
          {/* 4. Mantine DatesProvider – Thai locale for all date/time pickers */}
          <DatesProvider
            settings={{
              locale: "th",
              firstDayOfWeek: 0,
              weekendDays: [0, 6],
            }}
          >
            {children}
          </DatesProvider>
        </MantineProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
