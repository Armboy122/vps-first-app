import { TransformerSearchBar } from "./TransformerSearchBar";
import { TransformerTable } from "./TransformerTable";
import { CSVUploadComponent } from "./CSVUploadComponent";

export function TransformerManagement() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-text)]">จัดการหม้อแปลง</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            จัดการข้อมูลหม้อแปลง เพิ่ม แก้ไข ลบ และนำเข้าข้อมูลจากไฟล์ CSV
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <TransformerSearchBar />

      {/* Transformer Table */}
      <TransformerTable />

      {/* CSV Upload Section */}
      <CSVUploadComponent />
    </div>
  );
}
