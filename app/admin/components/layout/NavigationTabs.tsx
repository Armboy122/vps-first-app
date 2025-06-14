import { useAdminContext } from "../../context/AdminContext";
import { ADMIN_TABS } from "../../constants/admin.constants";

const TAB_LABELS = {
  [ADMIN_TABS.USERS]: "จัดการผู้ใช้",
  [ADMIN_TABS.TRANSFORMERS]: "จัดการหม้อแปลง", 
  [ADMIN_TABS.EXPORT]: "ส่งออกข้อมูล",
};

export function NavigationTabs() {
  const { activeTab, setActiveTab } = useAdminContext();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {Object.entries(TAB_LABELS).map(([tabKey, label]) => (
          <button
            key={tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === tabKey
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}