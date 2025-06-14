import { ReactNode } from "react";
import { AdminProvider } from "../../context/AdminContext";
import { AdminHeader } from "./AdminHeader";
import { NavigationTabs } from "./NavigationTabs";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <NavigationTabs />
          
          <main className="pb-8">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}