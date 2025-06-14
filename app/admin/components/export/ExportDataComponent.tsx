import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";
import { getPowerOutageRequests } from "@/app/api/action/powerOutageRequest";
import { WorkCenter, ExportOptions } from "../../types/admin.types";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { generateCSVContent } from "../../utils/csvParser";

export function ExportDataComponent() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    workCenterId: "",
    dateFrom: "",
    dateTo: "",
    format: "csv",
  });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch work centers for filter
  const { data: workCenters = [] } = useQuery({
    queryKey: ["workCenters"],
    queryFn: getWorkCenters,
    staleTime: 10 * 60 * 1000,
  });

  // Handle input change
  const handleInputChange = (field: keyof ExportOptions, value: string) => {
    setExportOptions((prev) => ({ ...prev, [field]: value }));
  };

  // Format time to HH:MM
  const formatTime = (timeString: string | Date): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      return timeString.toString();
    }
  };

  // Export data
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Prepare filter parameters
      const filters: any = {};

      if (exportOptions.workCenterId) {
        filters.workCenterId = parseInt(exportOptions.workCenterId);
      }

      if (exportOptions.dateFrom) {
        filters.dateFrom = exportOptions.dateFrom;
      }

      if (exportOptions.dateTo) {
        filters.dateTo = exportOptions.dateTo;
      }

      // Fetch power outage requests
      const response = await getPowerOutageRequests(1, 10000, filters);

      if (!response.data || response.data.length === 0) {
        alert("ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก");
        return;
      }

      // Prepare data for export
      const exportData = response.data.map((request: any) => ({
        วันที่ขอตัดไฟ: new Date(request.outageDate).toLocaleDateString("th-TH"),
        เวลาเริ่ม: formatTime(request.startTime),
        เวลาสิ้นสุด: formatTime(request.endTime),
        หมายเลขหม้อแปลง: request.transformerNumber,
        "รายละเอียด GIS": request.gisDetails,
        จุดรวมงาน: request.workCenter.name,
        สาขา: request.branch.shortName,
        ผู้ยื่นคำขอ: request.createdBy.fullName,
        รหัสพนักงาน: request.createdBy.employeeId || "-",
        สถานะคำขอOMS: request.omsStatus === "NOT_ADDED" ? "ยังไม่ส่งเข้าระบบ" : request.omsStatus === "PROCESSED" ? "ดำเนินการแล้ว" : "ยกเลิก",
        วันที่ส่งคำขอ: new Date(request.createdAt).toLocaleDateString("th-TH"),
      }));

      console.log("exportData", exportData);

      // Generate CSV content
      const headers = [
        "วันที่ขอตัดไฟ",
        "เวลาเริ่ม",
        "เวลาสิ้นสุด",
        "หมายเลขหม้อแปลง",
        "รายละเอียด GIS",
        "จุดรวมงาน",
        "สาขา",
        "ผู้ยื่นคำขอ",
        "รหัสพนักงาน",
        "สถานะคำขอOMS",
        "วันที่ส่งคำขอ",
      ];

      const csvContent = generateCSVContent(exportData, headers);

      // Create and download file
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0];
      const workCenterName = exportOptions.workCenterId
        ? workCenters.find(
            (wc) => wc.id.toString() === exportOptions.workCenterId
          )?.name || "ทั้งหมด"
        : "ทั้งหมด";

      link.setAttribute(
        "download",
        `คำขอตัดไฟ_${workCenterName}_${dateStr}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`ส่งออกข้อมูลสำเร็จ! (${exportData.length} รายการ)`);
    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ส่งออกข้อมูล</h2>
        <p className="text-gray-600 mt-1">
          ส่งออกข้อมูลคำขอตัดไฟเป็นไฟล์ CSV ตามเงื่อนไขที่กำหนด
        </p>
      </div>

      {/* Export Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📤 ตัวเลือกการส่งออก
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Center Filter */}
          <div>
            <label
              htmlFor="workCenter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              จุดรวมงาน
            </label>
            <select
              id="workCenter"
              value={exportOptions.workCenterId}
              onChange={(e) =>
                handleInputChange("workCenterId", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">ทุกจุดรวมงาน</option>
              {workCenters.map((wc: WorkCenter) => (
                <option key={wc.id} value={wc.id.toString()}>
                  {wc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              htmlFor="dateFrom"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              วันที่เริ่มต้น
            </label>
            <input
              id="dateFrom"
              type="date"
              value={exportOptions.dateFrom}
              onChange={(e) => handleInputChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label
              htmlFor="dateTo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              วันที่สิ้นสุด
            </label>
            <input
              id="dateTo"
              type="date"
              value={exportOptions.dateTo}
              onChange={(e) => handleInputChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Format */}
          <div>
            <label
              htmlFor="format"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              รูปแบบไฟล์
            </label>
            <select
              id="format"
              value={exportOptions.format}
              onChange={(e) =>
                handleInputChange("format", e.target.value as "csv" | "xlsx")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="csv">CSV (.csv)</option>
              <option value="xlsx" disabled>
                Excel (.xlsx) - เร็วๆนี้
              </option>
            </select>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" text="" className="mr-2" />
                กำลังส่งออก...
              </div>
            ) : (
              "📤 ส่งออกข้อมูล"
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-blue-800 text-sm font-medium mb-1">
            ข้อมูลที่จะส่งออก:
          </h4>
          <ul className="text-blue-700 text-xs space-y-1">
            <li>• วันที่และเวลาขอตัดไฟ</li>
            <li>• ข้อมูลหม้อแปลงและ GIS</li>
            <li>• ข้อมูลผู้ยื่นคำขอ</li>
            <li>• สถานะและวันที่ส่งคำขอ</li>
            <li>• ข้อมูลจุดรวมงานและสาขา</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
