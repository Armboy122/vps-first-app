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
            <Text fw={500} size="sm" mb="xs" c="red">
              📋 รายละเอียดข้อผิดพลาด ({validationErrors.length} รายการ):
            </Text>
            <div style={{ 
              maxHeight: "300px", 
              overflowY: "auto", 
              border: "1px solid #e9ecef",
              borderRadius: "4px",
              padding: "8px"
            }}>
              <List spacing="sm" size="sm">
                {validationErrors.map((validationError, index) => (
                  <List.Item key={index} style={{ 
                    padding: "8px",
                    backgroundColor: "#fff5f5",
                    borderRadius: "4px",
                    border: "1px solid #fed7d7"
                  }}>
                    <div>
                      <Text span fw={600} c="red">
                        🔴 รายการที่ {validationError.index}:
                      </Text>
                      <Text span size="sm" ml="xs">
                        {validationError.error}
                      </Text>
                    </div>
                    
                    {/* แสดงข้อมูลที่ผิดพลาด */}
                    {validationError.data && (
                      <div style={{ marginTop: "4px" }}>
                        <Text size="xs" c="gray.6" fw={500}>
                          💡 วิธีแก้ไข:
                        </Text>
                        {validationError.error.includes("ไม่พบหม้อแปลง") ? (
                          <Text size="xs" c="blue">
                            • ตรวจสอบหมายเลขหม้อแปลงให้ถูกต้อง<br/>
                            • ใช้ฟีเจอร์ค้นหาในระบบเพื่อหาหมายเลขที่ถูกต้อง<br/>
                            • ติดต่อผู้ดูแลระบบหากแน่ใจว่าหมายเลขถูกต้อง
                          </Text>
                        ) : validationError.error.includes("วันที่") ? (
                          <Text size="xs" c="blue">
                            • ตั้งวันที่ให้มากกว่าวันปัจจุบันอย่างน้อย 10 วัน<br/>
                            • ใช้รูปแบบ DD/MM/YYYY เช่น 25/07/2025
                          </Text>
                        ) : validationError.error.includes("เวลา") ? (
                          <Text size="xs" c="blue">
                            • ใช้เวลาในช่วง 06:00 - 20:00 น.<br/>
                            • เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้นอย่างน้อย 30 นาที<br/>
                            • ใช้รูปแบบ HH:MM เช่น 08:00
                          </Text>
                        ) : (
                          <Text size="xs" c="blue">
                            • ตรวจสอบข้อมูลในแถวนี้และแก้ไขให้ถูกต้อง
                          </Text>
                        )}
                      </div>
                    )}
                    
                    {showDetails && validationError.data && (
                      <Code block mt="xs" style={{ fontSize: "11px" }}>
                        {JSON.stringify(validationError.data, null, 2)}
                      </Code>
                    )}
                  </List.Item>
                ))}
              </List>
            </div>
            
            <Alert color="blue" icon={<span>💡</span>} mt="md" variant="light">
              <Text size="sm" fw={500}>คำแนะนำ:</Text>
              <Text size="xs">
                • แก้ไขข้อมูลใน CSV ตามคำแนะนำข้างต้น<br/>
                • บันทึกไฟล์และลองนำเข้าใหม่อีกครั้ง<br/>
                • หากยังมีปัญหา กรุณาติดต่อผู้ดูแลระบบ
              </Text>
            </Alert>
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