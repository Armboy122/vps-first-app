import { useAdminContext } from "../../context/AdminContext";
import { ADMIN_TABS } from "../../constants/admin.constants";

interface TabConfig {
  label: string;
  /** คำอธิบายสั้นๆ แสดงใต้ชื่อ tab เมื่อ active */
  description: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  [ADMIN_TABS.USERS]: {
    label: "จัดการผู้ใช้",
    description: "สิทธิ์, รหัสผ่าน, และข้อมูลบัญชี",
  },
  [ADMIN_TABS.TRANSFORMERS]: {
    label: "จัดการหม้อแปลง",
    description: "เพิ่ม แก้ไข ลบ และนำเข้าจาก CSV",
  },
  [ADMIN_TABS.BUSINESS_CALENDAR]: {
    label: "ปฏิทินวันทำการ",
    description: "วันหยุด, วันทำงานพิเศษ, และนำเข้า CSV",
  },
  [ADMIN_TABS.EXPORT]: {
    label: "ส่งออกข้อมูล",
    description: "ดาวน์โหลดคำขอตัดไฟเป็นไฟล์ CSV",
  },
};

export function NavigationTabs() {
  const { activeTab, setActiveTab } = useAdminContext();

  return (
    <div className="mb-5 overflow-x-auto border-b border-[var(--app-border)]">
      <nav className="flex min-w-max gap-1" aria-label="ส่วนจัดการระบบ">
        {Object.entries(TAB_CONFIG).map(([tabKey, config]) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`min-h-11 rounded-t-lg border-b-2 px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? "border-pea-700 bg-pea-50 text-pea-900"
                  : "border-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
              }`}
            >
              <span className="block">{config.label}</span>
              {isActive && (
                <span className="mt-0.5 block text-xs font-normal text-pea-700">
                  {config.description}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
