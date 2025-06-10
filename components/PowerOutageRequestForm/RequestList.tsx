"use client";
import React from "react";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { FormButton } from "@/components/forms";

interface RequestListProps {
  requests: PowerOutageRequestInput[];
  submitStatus: { success: boolean; message: string; isLoading?: boolean } | null;
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
  if (requests.length === 0) return null;

  return (
    <div className="mt-8 p-6 bg-gray-50 border-t border-gray-200 rounded-lg">
      {/* หัวข้อและปุ่มล้างทั้งหมด */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          รายการคำขอที่รอการบันทึก ({requests.length} รายการ)
        </h3>
        <FormButton
          variant="danger"
          size="sm"
          onClick={onClearAllRequests}
          icon="🗑️"
        >
          ล้างทั้งหมด
        </FormButton>
      </div>
      
      {/* รายการคำขอ */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {requests.map((request, index) => (
          <RequestCard
            key={index}
            request={request}
            index={index}
            onRemove={onRemoveFromList}
          />
        ))}
      </div>
      
      {/* สรุปและปุ่มบันทึกทั้งหมด */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-600">
          รวม {requests.length} รายการรอการบันทึก
        </div>
        <FormButton
          variant="success"
          onClick={onSubmitAll}
          isLoading={submitStatus?.isLoading}
          icon="📋"
        >
          บันทึกคำขอทั้งหมด
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

const RequestCard: React.FC<RequestCardProps> = ({ request, index, onRemove }) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-600">หม้อแปลง:</span>{" "}
              <span className="text-gray-900">{request.transformerNumber}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">วันที่:</span>{" "}
              <span className="text-gray-900">{request.outageDate}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">เวลา:</span>{" "}
              <span className="text-gray-900">{request.startTime} - {request.endTime}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">สถานที่:</span>{" "}
              <span className="text-gray-900">{request.gisDetails}</span>
            </div>
            {request.area && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-600">พื้นที่ไฟดับ:</span>{" "}
                <span className="text-gray-900">{request.area}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* ปุ่มลบ */}
        <button
          onClick={() => onRemove(index)}
          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          title="ลบรายการนี้"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
