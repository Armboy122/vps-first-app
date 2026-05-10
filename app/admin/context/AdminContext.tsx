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
  BusinessCalendarSearchParams,
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

  // สถานะสำหรับการค้นหาและการแบ่งหน้าปฏิทินวันทำการ
  const [businessCalendarSearchParams, setBusinessCalendarSearchParams] =
    useState<BusinessCalendarSearchParams>({
      page: 1,
      limit: USERS_PER_PAGE,
      search: "",
      type: "",
      includeInactive: false,
    });

  // สถานะของแท็บที่เปิดอยู่
  const [activeTab, setActiveTab] = useState<string>(ADMIN_TABS.USERS);

  // ฟังก์ชันสำหรับอัปเดตพารามิเตอร์การค้นหาผู้ใช้
  const updateSearchParams = useCallback(
    (newParams: Partial<UserSearchParams>) => {
      setSearchParams((prev) => {
        const updatedParams = { ...prev, ...newParams };
        
        // รีเซ็ตหน้าเป็น 1 เฉพาะเมื่อมีการเปลี่ยน search หรือ workCenterId (ไม่ใช่ page)
        if (
          (newParams.search !== undefined && newParams.search !== prev.search) ||
          (newParams.workCenterId !== undefined && newParams.workCenterId !== prev.workCenterId) ||
          (newParams.limit !== undefined && newParams.limit !== prev.limit)
        ) {
          updatedParams.page = 1;
        }
        
        return updatedParams;
      });
    },
    [],
  );

  // ฟังก์ชันสำหรับอัปเดตพารามิเตอร์การค้นหาหม้อแปลง
  const updateTransformerSearchParams = useCallback(
    (newParams: Partial<TransformerSearchParams>) => {
      setTransformerSearchParams((prev) => {
        const updatedParams = { ...prev, ...newParams };

        // รีเซ็ตหน้าเป็น 1 เมื่อมีการค้นหาใหม่ หรือเปลี่ยนขนาดหน้า
        if (
          (newParams.search !== undefined && newParams.search !== prev.search) ||
          (newParams.limit !== undefined && newParams.limit !== prev.limit)
        ) {
          updatedParams.page = 1;
        }

        return updatedParams;
      });
    },
    [],
  );

  // ฟังก์ชันสำหรับอัปเดตพารามิเตอร์การค้นหาปฏิทินวันทำการ
  const updateBusinessCalendarSearchParams = useCallback(
    (newParams: Partial<BusinessCalendarSearchParams>) => {
      setBusinessCalendarSearchParams((prev) => {
        const updatedParams = { ...prev, ...newParams };

        if (
          (newParams.search !== undefined && newParams.search !== prev.search) ||
          (newParams.type !== undefined && newParams.type !== prev.type) ||
          (newParams.includeInactive !== undefined &&
            newParams.includeInactive !== prev.includeInactive) ||
          (newParams.limit !== undefined && newParams.limit !== prev.limit)
        ) {
          updatedParams.page = 1;
        }

        return updatedParams;
      });
    },
    [],
  );

  const value: AdminContextType = {
    searchParams,
    updateSearchParams,
    transformerSearchParams,
    updateTransformerSearchParams,
    businessCalendarSearchParams,
    updateBusinessCalendarSearchParams,
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
