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
  [ADMIN_TABS.EXPORT]: {
    label: "ส่งออกข้อมูล",
    description: "ดาวน์โหลดคำขอตัดไฟเป็นไฟล์ CSV",
  },
};

export function NavigationTabs() {
  const { activeTab, setActiveTab } = useAdminContext();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {Object.entries(TAB_CONFIG).map(([tabKey, config]) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 text-left ${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="block">{config.label}</span>
              {isActive && (
                <span className="block text-xs font-normal text-blue-400 mt-0.5">
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