"use client";
import React, { useState } from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { FormButton } from "@/components/forms";
import { Trash2, X, ListChecks, Send } from "lucide-react";

interface RequestListProps {
  requests: PowerOutageRequestInput[];
  submitStatus: {
    success: boolean;
    message: string;
    isLoading?: boolean;
  } | null;
  onRemoveFromList: (index: number) => void;
  onClearAllRequests: () => void;
  onSubmitAll: () => void;
}

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  submitStatus,
  onRemoveFromList,
  onClearAllRequests,
  onSubmitAll,
}) => {
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (requests.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 ring-1 ring-blue-200/60">
            <ListChecks className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              รายการคำขอที่รอบันทึก
            </h3>
            <p className="text-sm text-slate-600">
              {requests.length} รายการ — เรียงตามวันที่อัตโนมัติ
            </p>
          </div>
        </div>
        {confirmingClear ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600 font-semibold">ยืนยันลบทั้งหมด?</span>
            <FormButton
              variant="danger"
              size="sm"
              onClick={() => {
                onClearAllRequests();
                setConfirmingClear(false);
              }}
            >
              ใช่ ลบทั้งหมด
            </FormButton>
            <FormButton
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingClear(false)}
            >
              ยกเลิก
            </FormButton>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingClear(true)}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ล้างทั้งหมด
          </button>
        )}
      </div>

      {/* Request cards */}
      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {requests.map((request, index) => (
          <RequestCard
            key={index}
            request={request}
            index={index}
            onRemove={onRemoveFromList}
          />
        ))}
      </div>

      {/* Footer with submit */}
      <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100 bg-slate-50/50">
        <span className="text-[15px] text-slate-600">
          รวม <strong className="text-slate-900">{requests.length}</strong> รายการรอบันทึก
        </span>
        <FormButton
          variant="success"
          onClick={onSubmitAll}
          isLoading={submitStatus?.isLoading}
        >
          <span className="inline-flex items-center gap-2">
            <Send className="w-4 h-4" />
            บันทึกคำขอทั้งหมด
          </span>
        </FormButton>
      </div>
    </div>
  );
};

/**
 * การ์ดแสดงรายละเอียดคำขอแต่ละรายการ
 */
interface RequestCardProps {
  request: PowerOutageRequestInput;
  index: number;
  onRemove: (index: number) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  index,
  onRemove,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
      {/* หมายเลขลำดับ */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>
      </div>

      {/* ข้อมูล */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-semibold text-slate-900 truncate">
            {request.transformerNumber}
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-slate-600">
            {formatDate(request.outageDate)}
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-slate-600">
            {request.startTime} - {request.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {request.gisDetails && <span className="truncate">{request.gisDetails}</span>}
          {request.area && (
            <>
              <span className="text-slate-400">-</span>
              <span className="truncate text-slate-500">{request.area}</span>
            </>
          )}
        </div>
      </div>

      {/* ปุ่มลบ */}
      <button
        onClick={() => onRemove(index)}
        className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        title="ลบรายการนี้"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
