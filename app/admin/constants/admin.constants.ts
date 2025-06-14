import { Role } from "@prisma/client";

// การแปลงบทบาทเป็นภาษาไทย
export const ROLE_TRANSLATIONS: Record<Role, string> = {
  USER: "พนักงานหม้อแปลง",
  SUPERVISOR: "พนักงาน EO", 
  MANAGER: "ผู้บริหารจุดรวมงาน",
  ADMIN: "Admin",
  VIEWER: "กฟต.3",
};

// จำนวนรายการต่อหน้า
export const USERS_PER_PAGE = 10;

// ข้อจำกัดด้านความปลอดภัยสำหรับการอัพโหลดไฟล์
export const SECURITY_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_ROWS_PER_UPLOAD: 10000,
  ALLOWED_FILE_TYPES: [".csv"],
  BATCH_SIZE: 100, // จำนวนรายการที่ประมวลผลพร้อมกัน
};

// ตัวเลือกขนาดหน้า
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Tab ใน Admin Panel
export const ADMIN_TABS = {
  USERS: "users",
  TRANSFORMERS: "transformers", 
  EXPORT: "export",
} as const;

// สีสำหรับ Role badges
export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-800",
  MANAGER: "bg-orange-100 text-orange-800", 
  SUPERVISOR: "bg-yellow-100 text-yellow-800",
  USER: "bg-blue-100 text-blue-800",
  VIEWER: "bg-gray-100 text-gray-800",
};