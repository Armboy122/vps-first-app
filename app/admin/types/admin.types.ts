import { Role } from "@prisma/client";

// =============================================================================
// SHARED / COMMON TYPES
// ประเภทข้อมูลที่ใช้ร่วมกันระหว่าง domain ต่างๆ ใน Admin
// =============================================================================

/** จุดรวมงาน (Work Center) — ใช้ร่วมกันระหว่าง UserManagement และ ExportManagement */
export interface WorkCenter {
  id: number;
  name: string;
}

// =============================================================================
// USER MANAGEMENT DOMAIN
// รับผิดชอบ: ดูรายชื่อผู้ใช้, เปลี่ยน Role, รีเซ็ตรหัสผ่าน, ลบผู้ใช้
// Component tree: UserManagement → UserSearchBar / UserTable → UserRow / UserPagination
// =============================================================================

/** ข้อมูลผู้ใช้ที่ใช้แสดงในตาราง */
export interface User {
  id: number;
  fullName: string;
  employeeId: string;
  role: Role;
  workCenter: {
    name: string;
  };
  branch: {
    fullName: string;
  };
}

/** พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้าของผู้ใช้ */
export interface UserSearchParams {
  page: number;
  limit: number;
  search: string;
  workCenterId?: string;
}

// =============================================================================
// TRANSFORMER MANAGEMENT DOMAIN
// รับผิดชอบ: ดูรายการหม้อแปลง, เพิ่ม/แก้ไข/ลบ, นำเข้าจากไฟล์ CSV
// Component tree: TransformerManagement → TransformerSearchBar / TransformerTable → TransformerRow / TransformerPagination / TransformerForm
//                                       → CSVUploadComponent
// =============================================================================

/** ข้อมูลหม้อแปลง */
export interface Transformer {
  id: number;
  transformerNumber: string;
  gisDetails: string;
  createdAt: Date;
  updatedAt: Date;
}

/** พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้าของหม้อแปลง */
export interface TransformerSearchParams {
  page: number;
  limit: number;
  search: string;
}

/** สถานะความคืบหน้าการอัพโหลดไฟล์ CSV */
export interface CSVUploadProgress {
  isUploading: boolean;
  progress: number;
  total: number;
  errors: string[];
}

// =============================================================================
// BUSINESS CALENDAR MANAGEMENT DOMAIN
// รับผิดชอบ: จัดการวันหยุดและวันทำงานพิเศษที่ใช้คำนวณวันทำการ
// Component tree: BusinessCalendarManagement → BusinessCalendarFilters / BusinessCalendarTable
//                                       → BusinessCalendarForm / BusinessCalendarCSVImport
// =============================================================================

export type BusinessCalendarEntryType = "HOLIDAY" | "SPECIAL_WORKDAY";

/** ข้อมูลวันทำการพิเศษ/วันหยุดสำหรับหน้า Admin */
export interface BusinessCalendarDate {
  id: number;
  dateKey: string;
  type: BusinessCalendarEntryType;
  name: string;
  scope: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้าปฏิทินวันทำการ */
export interface BusinessCalendarSearchParams {
  page: number;
  limit: number;
  search: string;
  type: "" | BusinessCalendarEntryType;
  includeInactive: boolean;
}

/** Payload สำหรับสร้าง/แก้ไขรายการปฏิทินวันทำการ */
export interface BusinessCalendarFormData {
  date: string;
  type: BusinessCalendarEntryType;
  name: string;
  scope: string;
  note: string;
  isActive: boolean;
}

// =============================================================================
// EXPORT MANAGEMENT DOMAIN
// รับผิดชอบ: ส่งออกคำขอตัดไฟเป็นไฟล์ CSV ตามเงื่อนไขที่กำหนด
// Component tree: ExportDataComponent (standalone, ไม่มี sub-components)
// =============================================================================

/** ตัวเลือกสำหรับการส่งออกข้อมูล */
export interface ExportOptions {
  workCenterId?: string;
  dateFrom?: string;
  dateTo?: string;
  format: "csv" | "xlsx";
}

// =============================================================================
// ADMIN CONTEXT
// เก็บ shared state ระหว่าง domain (search params, active tab)
// =============================================================================

/** ประเภทข้อมูลที่เก็บใน AdminContext */
export interface AdminContextType {
  /** User Management: search params สำหรับการค้นหาและแบ่งหน้าผู้ใช้ */
  searchParams: UserSearchParams;
  updateSearchParams: (newParams: Partial<UserSearchParams>) => void;
  /** Transformer Management: search params สำหรับการค้นหาและแบ่งหน้าหม้อแปลง */
  transformerSearchParams: TransformerSearchParams;
  updateTransformerSearchParams: (
    newParams: Partial<TransformerSearchParams>,
  ) => void;
  /** Business Calendar Management: search params สำหรับการค้นหาและแบ่งหน้าปฏิทินวันทำการ */
  businessCalendarSearchParams: BusinessCalendarSearchParams;
  updateBusinessCalendarSearchParams: (
    newParams: Partial<BusinessCalendarSearchParams>,
  ) => void;
  /** Navigation: tab ที่กำลังเปิดอยู่ใน Admin Panel */
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
