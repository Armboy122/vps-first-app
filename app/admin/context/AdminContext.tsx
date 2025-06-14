"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
import {
  AdminContextType,
  UserSearchParams,
  TransformerSearchParams,
} from "../types/admin.types";
import { USERS_PER_PAGE, ADMIN_TABS } from "../constants/admin.constants";

// สร้าง Context สำหรับจัดการสถานะ Admin
const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  // สถานะสำหรับการค้นหาและการแบ่งหน้าของผู้ใช้
  const [searchParams, setSearchParams] = useState<UserSearchParams>({
    page: 1,
    limit: USERS_PER_PAGE,
    search: "",
    workCenterId: undefined,
  });

  // สถานะสำหรับการค้นหาและการแบ่งหน้าของหม้อแปลง
  const [transformerSearchParams, setTransformerSearchParams] =
    useState<TransformerSearchParams>({
      page: 1,
      limit: USERS_PER_PAGE,
      search: "",
    });

  // สถานะของแท็บที่เปิดอยู่
  const [activeTab, setActiveTab] = useState<string>(ADMIN_TABS.USERS);

  // ฟังก์ชันสำหรับอัปเดตพารามิเตอร์การค้นหาผู้ใช้
  const updateSearchParams = useCallback(
    (newParams: Partial<UserSearchParams>) => {
      setSearchParams((prev) => ({
        ...prev,
        ...newParams,
        // รีเซ็ตหน้าเป็น 1 เมื่อมีการค้นหาใหม่
        page: newParams.search !== undefined || newParams.workCenterId !== undefined ? 1 : prev.page,
      }));
    },
    [],
  );

  // ฟังก์ชันสำหรับอัปเดตพารามิเตอร์การค้นหาหม้อแปลง
  const updateTransformerSearchParams = useCallback(
    (newParams: Partial<TransformerSearchParams>) => {
      setTransformerSearchParams((prev) => ({
        ...prev,
        ...newParams,
        // รีเซ็ตหน้าเป็น 1 เมื่อมีการค้นหาใหม่
        page: newParams.search !== undefined ? 1 : prev.page,
      }));
    },
    [],
  );

  const value: AdminContextType = {
    searchParams,
    updateSearchParams,
    transformerSearchParams,
    updateTransformerSearchParams,
    activeTab,
    setActiveTab,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

// Hook สำหรับใช้ Context
export function useAdminContext(): AdminContextType {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdminContext must be used within an AdminProvider");
  }
  return context;
}