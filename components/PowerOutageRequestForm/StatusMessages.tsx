"use client";
import React from "react";
import dayjs from "dayjs";

interface StatusMessagesProps {
  timeError: string | null;
  submitStatus: { success: boolean; message: string; isLoading?: boolean } | null;
  daysFromToday: number | null;
  watchedOutageDate: string;
  minSelectableDate: string;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  timeError,
  submitStatus,
  daysFromToday,
  watchedOutageDate,
  minSelectableDate,
}) => {
  return (
    <>
      {/* ข้อผิดพลาดเกี่ยวกับเวลา */}
      {timeError && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {timeError}
        </div>
      )}

      {/* คำเตือนเมื่อวันที่ไม่ถูกต้อง */}
      {daysFromToday !== null && daysFromToday <= 10 && watchedOutageDate && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">ไม่สามารถบันทึกได้:</span> วันที่ที่เลือกต้องมากกว่า 10 วันจากวันปัจจุบัน 
                กรุณาเลือกวันที่ {dayjs(minSelectableDate).format('DD/MM/YYYY')} หรือหลังจากนั้น
              </p>
            </div>
          </div>
        </div>
      )}

      {/* สถานะการส่งข้อมูล */}
      {submitStatus && (
        <div
          className={`p-4 rounded-md ${
            submitStatus.success
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            {submitStatus.isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            )}
            <div className="flex-1">
              {submitStatus.message.includes('\n') ? (
                <pre className="whitespace-pre-wrap text-sm font-medium">
                  {submitStatus.message}
                </pre>
              ) : (
                <p className="text-sm font-medium">{submitStatus.message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
