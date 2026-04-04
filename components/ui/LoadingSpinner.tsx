"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";

interface LoadingSpinnerProps {
  /** Loader size – passed directly to Mantine Loader */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Minimum height of the centering wrapper */
  minHeight?: number | string;
  /** Optional primary label shown under the spinner */
  label?: string;
  /** Optional muted secondary text */
  description?: string;
  /** Extra wrapper className for layout-specific tuning */
  className?: string;
}

/**
 * Shared loading indicator.
 * Uses Mantine's Loader so it respects the app theme and accessibility
 * standards (role="status" / aria-label are built in).
 */
export const LoadingSpinner = ({
  size = "xl",
  minHeight = 256,
  label = "กำลังโหลดข้อมูล",
  description,
  className = "",
}: LoadingSpinnerProps = {}) => (
  <Center
    style={{ minHeight }}
    className={`px-4 py-8 ${className}`}
    role="status"
    aria-live="polite"
  >
    <Stack gap={6} align="center">
      <Loader size={size} color="var(--app-pea)" />
      <Text fw={600} size="sm" style={{ color: "var(--app-text)" }}>
        {label}
      </Text>
      {description && (
        <Text size="xs" c="dimmed" ta="center" maw={360}>
          {description}
        </Text>
      )}
    </Stack>
  </Center>
);
