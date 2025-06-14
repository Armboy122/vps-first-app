"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faExclamationCircle,
  faCheckCircle,
  faBan,
  faCalendarDay,
  faCalendarTimes,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useMemo, memo } from "react";
import { getThailandDateAtMidnight } from "@/lib/date-utils";

interface PowerOutageRequest {
  id: number;
  outageDate: Date;
  omsStatus: string;
  statusRequest: string;
}

interface OMSStatusSummaryProps {
  requests: PowerOutageRequest[];
  filteredRequests: PowerOutageRequest[]; // เพิ่ม prop สำหรับข้อมูลที่ถูกกรองแล้ว
  showFilteredSummary?: boolean; // flag กำหนดว่าจะแสดง summary ตามการกรองหรือไม่
}

export const OMSStatusSummary = memo(
  ({
    requests,
    filteredRequests,
    showFilteredSummary = true, // ค่าเริ่มต้นคือแสดงผลตามการกรอง
  }: OMSStatusSummaryProps) => {
    // คำนวณข้อมูลสรุปจากข้อมูลคำขอที่ได้รับ
    const summaryData = useMemo(() => {
      // เลือกใช้ข้อมูลตาม flag showFilteredSummary
      const dataSource = showFilteredSummary ? filteredRequests : requests;

      // ค่า default: สถานะคำขอ = อนุมัติ (CONFIRM) สถานะ OMS = ยังไม่ได้เพิ่ม (NOT_ADDED)
      const defaultFilter = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "NOT_ADDED",
      );

      const today = getThailandDateAtMidnight();

      // รายการที่เลยวันดับไฟไปแล้ว และยังไม่ได้ดำเนินการ
      const overdue = defaultFilter.filter(
        (req) => new Date(req.outageDate) < today,
      );

      // รายการที่ต้องดำเนินการภายใน 5 วัน
      const urgentItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      });

      // รายการที่ต้องดำเนินการภายใน 6-7 วัน
      const mediumUrgentItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 6 && diffDays <= 7;
      });

      // รายการที่ต้องดำเนินการภายใน 8-15 วัน
      const normalItems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 8 && diffDays <= 15;
      });

      // รายการที่ต้องดำเนินการมากกว่า 15 วัน
      const futureitems = defaultFilter.filter((req) => {
        const outageDate = new Date(req.outageDate);
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 15;
      });

      // รายการที่ดำเนินการแล้ว
      const processedItems = dataSource.filter(
        (req) =>
          req.statusRequest === "CONFIRM" && req.omsStatus === "PROCESSED",
      );

      // รายการที่ยกเลิกแล้ว
      const cancelledItems = dataSource.filter(
        (req) =>
          req.omsStatus === "CANCELLED" || req.statusRequest === "CANCELLED",
      );

      return {
        defaultItems: defaultFilter.length,
        overdue: overdue.length,
        urgentItems: urgentItems.length,
        mediumUrgentItems: mediumUrgentItems.length,
        normalItems: normalItems.length,
        futureitems: futureitems.length,
        processedItems: processedItems.length,
        cancelledItems: cancelledItems.length,
        totalItems: dataSource.length,
        isFiltered:
          showFilteredSummary && filteredRequests.length !== requests.length, // เพิ่มสถานะว่ามีการกรองหรือไม่
      };
    }, [requests, filteredRequests, showFilteredSummary]);

    // ถ้ากรองแล้วไม่มีข้อมูล ไม่ต้องแสดง summary
    if (showFilteredSummary && filteredRequests.length === 0) {
      return (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-blue-600 mr-2"
            />
            <h2 className="text-lg font-semibold text-gray-800">
              ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
            </h2>
          </div>
          <p className="text-gray-600">
            กรุณาปรับเปลี่ยนเงื่อนไขการค้นหาเพื่อดูข้อมูลสรุป
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-3 justify-between">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faChartBar} className="text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">
              สรุปสถานะการลงข้อมูลในระบบ OMS
            </h2>
          </div>
          {summaryData.isFiltered && (
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              กำลังแสดงข้อมูลตามการกรอง ({filteredRequests.length} รายการ)
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* เหลือเฉพาะการแสดงสถานะที่ต้องการ */}

          {/* รายการเร่งด่วน (ภายใน 5 วัน) */}
          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <div className="text-red-800 font-medium mb-2 flex items-center">
              <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
              เร่งด่วน (0-5 วัน)
            </div>
            <div className="text-2xl font-bold text-red-900 mb-1">
              {summaryData.urgentItems}
            </div>
            <div className="text-sm text-red-700">
              รายการที่ต้องดำเนินการด่วน
            </div>
          </div>

          {/* รายการเร่งด่วนปานกลาง (6-7 วัน) */}
          <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="text-yellow-800 font-medium mb-2 flex items-center">
              <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
              เร่งด่วนปานกลาง (6-7 วัน)
            </div>
            <div className="text-2xl font-bold text-yellow-900 mb-1">
              {summaryData.mediumUrgentItems}
            </div>
            <div className="text-sm text-yellow-700">
              รายการที่ต้องดำเนินการเร็วๆ นี้
            </div>
          </div>

          {/* รายการปกติ (8-15 วัน) */}
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="text-green-800 font-medium mb-2 flex items-center">
              <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
              ปกติ (8-15 วัน)
            </div>
            <div className="text-2xl font-bold text-green-900 mb-1">
              {summaryData.normalItems}
            </div>
            <div className="text-sm text-green-700">
              รายการที่มีเวลาดำเนินการปกติ
            </div>
          </div>

          {/* รายการในอนาคต (มากกว่า 15 วัน) */}
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="text-green-800 font-medium mb-2 flex items-center">
              <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
              ในอนาคต (มากกว่า 15 วัน)
            </div>
            <div className="text-2xl font-bold text-green-900 mb-1">
              {summaryData.futureitems}
            </div>
            <div className="text-sm text-green-700">
              รายการที่ยังไม่เร่งด่วน
            </div>
          </div>
        </div>
      </div>
    );
  },
);

OMSStatusSummary.displayName = "OMSStatusSummary";
