"use client";
import Link from "next/link";
import { Plus, Printer, CheckSquare, ChevronDown } from "lucide-react";
import PrintAnnouncement from "../print";
import { Request } from "@prisma/client";
import { ActionFeedback, ActionFeedbackState } from "./ActionFeedback";

interface BulkActionsProps {
  isUser: boolean;
  isAdmin: boolean;
  isViewer?: boolean;
  selectedRequests: number[];
  handleBulkStatusChange: (status: Request) => void;
  handlePrintSelected: () => void | Promise<void>;
  actionFeedback: ActionFeedbackState | null;
  onDismissActionFeedback: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  isUser,
  isAdmin,
  isViewer = false,
  selectedRequests,
  handleBulkStatusChange,
  handlePrintSelected,
  actionFeedback,
  onDismissActionFeedback,
}) => {
  if (isViewer) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-4">
      {actionFeedback && (
        <ActionFeedback
          variant={actionFeedback.variant}
          title={actionFeedback.title}
          message={actionFeedback.message}
          onDismiss={onDismissActionFeedback}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {(isUser || isAdmin) && (
            <Link
              href="/power-outage-requests/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              สร้างคำขอดับไฟใหม่
            </Link>
          )}

          {selectedRequests.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  onChange={(e) =>
                    handleBulkStatusChange(e.target.value as Request)
                  }
                  className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3.5 pr-9 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 font-medium cursor-pointer transition-all"
                  defaultValue=""
                >
                  <option value="" disabled>
                    เปลี่ยนสถานะ ({selectedRequests.length})
                  </option>
                  <option value="CONFIRM">อนุมัติดับไฟ</option>
                  <option value="CANCELLED">ยกเลิก</option>
                  <option value="NOT">รออนุมัติ</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <button
                onClick={handlePrintSelected}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-3.5 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                พิมพ์ ({selectedRequests.length})
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              เลือกรายการจากตารางเพื่อเปลี่ยนสถานะหรือพิมพ์เอกสารพร้อมกัน
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedRequests.length > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedRequests.length} รายการที่เลือก</span>
            </div>
          )}
          <PrintAnnouncement />
        </div>
      </div>
    </div>
  );
};
