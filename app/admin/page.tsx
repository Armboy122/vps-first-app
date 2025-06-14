"use client";

import { AdminLayout } from "./components/layout/AdminLayout";
import { UserManagement } from "./components/user-management/UserManagement";
import { TransformerManagement } from "./components/transformer-management/TransformerManagement";
import { ExportDataComponent } from "./components/export/ExportDataComponent";
import { useAdminContext } from "./context/AdminContext";
import { ADMIN_TABS } from "./constants/admin.constants";

export default function AdminPage() {
  return (
    <AdminLayout>
      <AdminContent />
    </AdminLayout>
  );
}

function AdminContent() {
  const { activeTab } = useAdminContext();

  const renderActiveTab = () => {
    switch (activeTab) {
      case ADMIN_TABS.USERS:
        return <UserManagement />;
      case ADMIN_TABS.TRANSFORMERS:
        return <TransformerManagement />;
      case ADMIN_TABS.EXPORT:
        return <ExportDataComponent />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="space-y-6">
      {renderActiveTab()}
    </div>
  );
}