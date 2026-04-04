"use client";

import React from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface ValidationError {
  index: number;
  error: string;
  data?: any;
}

interface ErrorModalProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  type?: "error" | "warning" | "success" | "info";
  validationErrors?: ValidationError[];
  showDetails?: boolean;
}

const modalMap = {
  error: {
    tone: "red",
    icon: XCircleIcon,
    defaultTitle: "เกิดข้อผิดพลาด",
    iconShell: "bg-red-50 text-red-600",
  },
  warning: {
    tone: "yellow",
    icon: ExclamationTriangleIcon,
    defaultTitle: "คำเตือน",
    iconShell: "bg-yellow-50 text-yellow-700",
  },
  success: {
    tone: "green",
    icon: CheckCircleIcon,
    defaultTitle: "สำเร็จ",
    iconShell: "bg-green-50 text-green-600",
  },
  info: {
    tone: "blue",
    icon: InformationCircleIcon,
    defaultTitle: "ข้อมูล",
    iconShell: "bg-blue-50 text-blue-600",
  },
} as const;

export const ErrorModal: React.FC<ErrorModalProps> = ({
  opened,
  onClose,
  title,
  message,
  type = "error",
  validationErrors = [],
  showDetails = false,
}) => {
  const config = modalMap[type];
  const Icon = config.icon;
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm" wrap="nowrap">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${config.iconShell}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <Text fw={700} size="lg" lh={1.1}>
              {title || config.defaultTitle}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {type === "success"
                ? "ผลลัพธ์พร้อมใช้งาน"
                : "ตรวจสอบรายละเอียดด้านล่าง"}
            </Text>
          </div>
        </Group>
      }
      size="lg"
      centered
      radius="lg"
      shadow="xl"
      overlayProps={{ blur: 4, opacity: 0.28 }}
      transitionProps={{ transition: "pop", duration: 180 }}
      closeOnClickOutside={type !== "error"}
    >
      <Stack gap="md">
        {message && (
          <Alert color={config.tone} variant="light" radius="md">
            <Text size="sm" lh={1.6}>
              {message}
            </Text>
          </Alert>
        )}

        {hasValidationErrors && (
          <Paper
            withBorder
            radius="md"
            className="border-slate-200 bg-slate-50/80 p-4"
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm" c="red">
                  รายละเอียดข้อผิดพลาด
                </Text>
                <Badge color="red" variant="light" radius="sm">
                  {validationErrors.length} รายการ
                </Badge>
              </Group>

              <Stack gap="sm" className="max-h-72 overflow-auto pr-1">
                {validationErrors.map((validationError) => (
                  <Paper
                    key={`${validationError.index}-${validationError.error}`}
                    withBorder
                    radius="md"
                    className="border-red-200 bg-white p-3"
                  >
                    <Stack gap={6}>
                      <Group gap="xs" wrap="nowrap">
                        <Badge color="red" variant="light" radius="sm">
                          แถว {validationError.index}
                        </Badge>
                        <Text fw={600} size="sm" c="red">
                          {validationError.error}
                        </Text>
                      </Group>

                      {validationError.data && (
                        <Box>
                          <Text size="xs" fw={600} c="dimmed" mb={4}>
                            ข้อมูลที่เกี่ยวข้อง
                          </Text>
                          {showDetails ? (
                            <Code block fz={11}>
                              {JSON.stringify(validationError.data, null, 2)}
                            </Code>
                          ) : (
                            <Text size="xs" c="dimmed" lh={1.5}>
                              เปิด `showDetails` เพื่อดู payload แบบเต็ม
                            </Text>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}

        <Group justify="flex-end">
          <Button
            variant="filled"
            color={config.tone}
            onClick={onClose}
            radius="md"
          >
            {type === "success" ? "ตกลง" : "ปิด"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
