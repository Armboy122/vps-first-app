"use client";
import React from "react";
import { Modal, Button, Alert, Stack, Text, List, Code } from "@mantine/core";
// ใช้ emoji แทน icons เพื่อไม่ต้องติดตั้ง package เพิ่ม

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

export const ErrorModal: React.FC<ErrorModalProps> = ({
  opened,
  onClose,
  title,
  message,
  type = "error",
  validationErrors = [],
  showDetails = false,
}) => {
  const getModalConfig = () => {
    switch (type) {
      case "success":
        return {
          color: "green",
          icon: "✅",
          defaultTitle: "สำเร็จ",
          alertColor: "green",
        };
      case "warning":
        return {
          color: "yellow",
          icon: "⚠️",
          defaultTitle: "คำเตือน",
          alertColor: "yellow",
        };
      case "info":
        return {
          color: "blue",
          icon: "ℹ️",
          defaultTitle: "ข้อมูล",
          alertColor: "blue",
        };
      default:
        return {
          color: "red",
          icon: "❌",
          defaultTitle: "เกิดข้อผิดพลาด",
          alertColor: "red",
        };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>{config.icon}</span>
          <Text fw={600} size="lg">
            {title || config.defaultTitle}
          </Text>
        </div>
      }
      size="md"
      centered
      styles={{
        title: {
          color: config.color === "red" ? "#fa5252" : 
                 config.color === "green" ? "#51cf66" :
                 config.color === "yellow" ? "#ffd43b" : "#339af0"
        }
      }}
    >
      <Stack gap="md">
        {/* ข้อความหลัก */}
        {message && (
          <Alert
            color={config.alertColor}
            icon={<span>{config.icon}</span>}
            variant="light"
          >
            <Text size="sm">{message}</Text>
          </Alert>
        )}

        {/* รายการ validation errors */}
        {validationErrors.length > 0 && (
          <div>
            <Text fw={500} size="sm" mb="xs">
              รายละเอียดข้อผิดพลาด:
            </Text>
            <List spacing="xs" size="sm">
              {validationErrors.map((validationError, index) => (
                <List.Item key={index}>
                  <Text span fw={500}>
                    รายการที่ {validationError.index}:
                  </Text>{" "}
                  <Text span size="sm">
                    {validationError.error}
                  </Text>
                  {showDetails && validationError.data && (
                    <Code block mt="xs" style={{ fontSize: "12px" }}>
                      {JSON.stringify(validationError.data, null, 2)}
                    </Code>
                  )}
                </List.Item>
              ))}
            </List>
          </div>
        )}

        {/* ปุ่มปิด */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button
            variant="outline"
            color={config.color}
            onClick={onClose}
          >
            {type === "success" ? "ตกลง" : "ปิด"}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
};