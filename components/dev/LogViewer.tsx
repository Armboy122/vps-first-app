"use client";
import React, { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";

/**
 * Component สำหรับ debug - ดู logs ที่เก็บใน localStorage
 * ใช้ใน development เท่านั้น
 */
export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // โหลด logs จาก localStorage
  const loadLogs = () => {
    const storedLogs = logger.getLogsFromStorage();
    setLogs(storedLogs.reverse()); // ใหม่สุดขึ้นบน
  };

  useEffect(() => {
    loadLogs();
    // อัพเดททุก 5 วินาที
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // กรอง logs ตามการค้นหาและ category
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      filter === "" ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      (log.details &&
        JSON.stringify(log.details)
          .toLowerCase()
          .includes(filter.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // สีสำหรับแต่ละ log level
  const getLevelColor = (level: string) => {
    switch (level) {
      case "debug":
        return "text-gray-600";
      case "info":
        return "text-blue-600";
      case "warn":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      case "audit":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // Categories ที่มีใน logs
  const categories = Array.from(new Set(logs.map((log) => log.category)));

  if (process.env.NODE_ENV !== "development") {
    return null; // ไม่แสดงใน production
  }

  return (
    <>
      {/* ปุ่มเปิด/ปิด log viewer */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="ดู Logs (Development)"
        >
          📊 {logs.length}
        </button>
      </div>

      {/* Log viewer modal */}
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">
                📊 Application Logs ({logs.length})
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const dataStr = logger.exportLogs();
                    const dataBlob = new Blob([dataStr], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `app-logs-${new Date().toISOString().slice(0, 10)}.json`;
                    link.click();
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Export
                </button>
                <button
                  onClick={() => {
                    logger.clearLogs();
                    loadLogs();
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-gray-50 flex space-x-4">
              <input
                type="text"
                placeholder="ค้นหา logs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                onClick={loadLogs}
                className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Refresh
              </button>
            </div>

            {/* Logs list */}
            <div className="flex-1 overflow-auto p-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  ไม่พบ logs ที่ตรงกับเงื่อนไข
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="border rounded p-3 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-mono ${getLevelColor(log.level)}`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-sm bg-gray-200 px-2 py-1 rounded">
                            {log.category}
                          </span>
                          <span className="font-medium">{log.action}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString("th-TH")}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        {log.userId && (
                          <div>
                            <strong>User:</strong> {log.userId} ({log.userRole})
                          </div>
                        )}
                        {log.page && (
                          <div>
                            <strong>Page:</strong> {log.page}
                          </div>
                        )}
                      </div>

                      {log.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            ดูรายละเอียด
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// สองคีย์ลัดสำหรับเปิด log viewer ด้วยคีย์บอร์ด
export const LogViewerShortcut: React.FC = () => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl + Shift + L เพื่อเปิด log viewer
      if (event.ctrlKey && event.shiftKey && event.key === "L") {
        event.preventDefault();

        // สร้าง event เพื่อเปิด log viewer
        const toggleEvent = new CustomEvent("toggleLogViewer");
        window.dispatchEvent(toggleEvent);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return null;
};
