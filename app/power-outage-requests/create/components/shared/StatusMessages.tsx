"use client";
import React, { useEffect, useRef } from "react";
import dayjs from "dayjs";
import {
  MIN_OUTAGE_BUSINESS_DAYS,
  MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE,
} from "@/lib/validations/powerOutageRequest";

interface StatusMessagesProps {
  timeError: string | null;
  submitStatus: {
    success: boolean;
    message: string;
    isLoading?: boolean;
  } | null;
  daysFromToday: number | null;
  calendarDaysFromToday: number | null;
  watchedOutageDate: string;
  minSelectableDate: string;
}

/**
 * StatusMessages -- shows time errors, date warnings, and submit feedback.
 *
 * Design decisions:
 *   - Success toasts auto-fade after 4 s (non-loading only) so they do not
 *     clutter the page after a routine "add to list" action.
 *   - Error / loading states persist until resolved.
 *   - The date warning explains *both* what went wrong and how to fix it.
 */
export const StatusMessages: React.FC<StatusMessagesProps> = ({
  timeError,
  submitStatus,
  daysFromToday,
  calendarDaysFromToday,
  watchedOutageDate,
  minSelectableDate,
}) => {
  // Auto-fade success banners (non-loading) after 4 seconds
  const [visible, setVisible] = React.useState(true);
  const prevMessage = useRef(submitStatus?.message);

  useEffect(() => {
    // Re-show when a new message arrives
    if (submitStatus?.message !== prevMessage.current) {
      setVisible(true);
      prevMessage.current = submitStatus?.message;
    }

    if (submitStatus?.success && !submitStatus.isLoading) {
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const showSubmitStatus =
    submitStatus && (visible || !submitStatus.success || submitStatus.isLoading);

  return (
    <>
      {/* ข้อผิดพลาดเกี่ยวกับเวลา */}
      {timeError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-bold" aria-hidden="true">!</span>
            <div>
              <p className="text-[15px] font-bold text-red-800">ข้อผิดพลาดเกี่ยวกับเวลา</p>
              <p className="mt-1 text-sm text-red-700 leading-relaxed">{timeError}</p>
            </div>
          </div>
        </div>
      )}

      {/* คำเตือนเมื่อวันที่ใกล้เกินไป -- ปุ่มถูก disable แล้วแต่ยังต้องอธิบายให้ชัด */}
      {watchedOutageDate &&
        ((daysFromToday !== null && daysFromToday < MIN_OUTAGE_BUSINESS_DAYS) ||
          (calendarDaysFromToday !== null &&
            calendarDaysFromToday <= MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE)) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm" aria-hidden="true">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-bold text-amber-800">
                ยังไม่สามารถบันทึกคำขอได้
              </p>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                วันที่ที่เลือกห่างจากวันนี้ <strong>{daysFromToday} วันทำการ</strong> และ <strong>{calendarDaysFromToday} วันปฏิทิน</strong> แต่ระบบกำหนดให้ล่วงหน้าอย่างน้อย {MIN_OUTAGE_BUSINESS_DAYS} วันทำการ และต้องมากกว่า {MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน
              </p>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                กรุณาเลือกวันที่ตั้งแต่ <strong>{dayjs(minSelectableDate).format("DD/MM/YYYY")}</strong> เป็นต้นไป
              </p>
            </div>
          </div>
        </div>
      )}

      {/* สถานะการส่งข้อมูล */}
      {showSubmitStatus && (
        <div
          className={`rounded-lg border p-4 transition-opacity duration-300 ${
            submitStatus.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start gap-3">
            {submitStatus.isLoading ? (
              <div className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            ) : (
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
                submitStatus.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600 font-bold"
              }`} aria-hidden="true">
                {submitStatus.success ? "\u2713" : "!"}
              </span>
            )}
            <div className="flex-1">
              {submitStatus.message.includes("\n") ? (
                <pre className="whitespace-pre-wrap text-[15px] font-medium">
                  {submitStatus.message}
                </pre>
              ) : (
                <p className="text-[15px] font-medium">{submitStatus.message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
