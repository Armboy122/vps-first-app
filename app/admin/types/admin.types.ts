import { Role } from "@prisma/client";

// ประเภทข้อมูลผู้ใช้ที่ใช้แสดงในตาราง
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

// ประเภทข้อมูลหม้อแปลง
export interface Transformer {
  id: number;
  transformerNumber: string;
  gisDetails: string;
  createdAt: Date;
  updatedAt: Date;
}

// ประเภทข้อมูลจุดรวมงาน
export interface WorkCenter {
  id: number;
  name: string;
}

// พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้า
export interface UserSearchParams {
  page: number;
  limit: number;
  search: string;
  workCenterId?: string;
}

// พารามิเตอร์สำหรับการค้นหา Transformer
export interface TransformerSearchParams {
  page: number;
  limit: number;
  search: string;
}

// ข้อมูลที่เก็บใน Context
export interface AdminContextType {
  searchParams: UserSearchParams;
  updateSearchParams: (newParams: Partial<UserSearchParams>) => void;
  transformerSearchParams: TransformerSearchParams;
  updateTransformerSearchParams: (
    newParams: Partial<TransformerSearchParams>,
  ) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ประเภทข้อมูล CSV Upload
export interface CSVUploadProgress {
  isUploading: boolean;
  progress: number;
  total: number;
  errors: string[];
}

// ประเภทข้อมูลสำหรับ Export
export interface ExportOptions {
  workCenterId?: string;
  dateFrom?: string;
  dateTo?: string;
  format: "csv" | "xlsx";
}