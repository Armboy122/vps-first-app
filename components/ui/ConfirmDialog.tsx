"use client";

/**
 * ConfirmDialog
 *
 * A Mantine-based confirmation modal that replaces window.confirm() calls.
 * Supports a destructive variant (red confirm button) for dangerous actions
 * such as deletions. Parent components remain the source of truth for
 * closing the dialog after the confirm action succeeds.
 *
 * Usage:
 *   const [opened, { open, close }] = useDisclosure(false);
 *
 *   <ConfirmDialog
 *     opened={opened}
 *     onClose={close}
 *     onConfirm={handleDelete}
 *     title="ลบรายการ"
 *     message="คุณต้องการลบรายการนี้ใช่หรือไม่?"
 *     confirmLabel="ลบ"
 *     isDestructive
 *   />
 */

import React, { useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  opened: boolean;
  /** Called when the dialog is closed (via cancel, overlay click, or Escape) */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title?: string;
  /** Body message / description */
  message?: string;
  /** Label for the confirm button (default: "ยืนยัน") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "ยกเลิก") */
  cancelLabel?: string;
  /**
   * When true the confirm button renders in red (danger variant).
   * Use for irreversible or destructive actions (e.g. delete).
   */
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  opened,
  onClose,
  onConfirm,
  title = "ยืนยันการดำเนินการ",
  message = "คุณต้องการดำเนินการนี้ใช่หรือไม่?",
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  isDestructive = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={isSubmitting ? () => undefined : onClose}
      title={
        <Text fw={700} size="lg" className="font-display">
          {title}
        </Text>
      }
      size="sm"
      centered
      radius="lg"
      shadow="xl"
      overlayProps={{ blur: 4, opacity: 0.28 }}
      transitionProps={{ transition: "pop", duration: 180 }}
      closeOnClickOutside={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <Stack gap="lg">
        <Alert
          color={isDestructive ? "red" : "pea"}
          variant="light"
          radius="md"
          icon={
            isDestructive ? (
              <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
            )
          }
        >
          <Text size="sm" lh={1.6} id="confirm-dialog-description">
            {message}
          </Text>
        </Alert>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={onClose}
            disabled={isSubmitting}
            radius="md"
          >
            {cancelLabel}
          </Button>
          <Button
            color={isDestructive ? "red" : "pea"}
            onClick={handleConfirm}
            loading={isSubmitting}
            radius="md"
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
