"use client";

import {
  useState,
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "react-query";
import { debounce } from "lodash";

// Services
import {
  deleteUser,
  getUsers,
  updateUserRole,
  resetUserPassword,
  getTransformers,
  createTransformer,
  updateTransformer,
  deleteTransformer,
  bulkUpsertTransformers,
} from "../api/action/User";
import { getWorkCenters } from "../api/action/getWorkCentersAndBranches";
import {
  getOMSStatusDistributionByWorkCenter,
  getOMSStatusByWorkCenter,
} from "../api/action/dashboard";
import { getPowerOutageRequests } from "../api/action/powerOutageRequest";

// ---------- Types ---------- //

// ประเภทข้อมูลผู้ใช้ที่ใช้แสดงในตาราง
interface User {
  id: number;
  fullName: string;
  employeeId: string;
  role: Role;
  workCenter: {
    name: string;
  };
  branch: {
    fullName: string;
  };
}

// ประเภทข้อมูลหม้อแปลง
interface Transformer {
  id: number;
  transformerNumber: string;
  gisDetails: string;
  createdAt: Date;
  updatedAt: Date;
}

// ประเภทข้อมูลจุดรวมงาน
interface WorkCenter {
  id: number;
  name: string;
}

// พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้า
interface UserSearchParams {
  page: number;
  limit: number;
  search: string;
  workCenterId?: string;
}

// พารามิเตอร์สำหรับการค้นหา Transformer
interface TransformerSearchParams {
  page: number;
  limit: number;
  search: string;
}

// ข้อมูลที่เก็บใน Context
interface UserContextType {
  searchParams: UserSearchParams;
  updateSearchParams: (newParams: Partial<UserSearchParams>) => void;
  transformerSearchParams: TransformerSearchParams;
  updateTransformerSearchParams: (
    newParams: Partial<TransformerSearchParams>,
  ) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ---------- ค่าคงที่ ---------- //

// แปลค่า Role Enum เป็นข้อความภาษาไทย
const ROLE_TRANSLATIONS: { [key in Role]: string } = {
  VIEWER: "กฟต.3",
  ADMIN: "Admin",
  MANAGER: "ผู้บริหารจุดรวมงาน",
  SUPERVISOR: "พนักงาน EO",
  USER: "พนักงานหม้อแปลง",
};

// จำนวนผู้ใช้ต่อหน้า
const USERS_PER_PAGE = 10;

// ค่าจำกัดความปลอดภัย - ย้ายมาไว้นอก component
const SECURITY_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // เพิ่มเป็น 100MB
  MAX_ROWS: 100000, // เพิ่มเป็น 100,000 แถว
  MAX_FIELD_LENGTH: 500, // ความยาวสูงสุดของแต่ละฟิลด์
  MIN_UPLOAD_INTERVAL: 15000, // เพิ่มเป็น 15 วินาทีสำหรับข้อมูลจำนวนมาก
};

// CSV Parser function - ย้ายมาไว้นอก component
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

// ---------- Context สำหรับการจัดการพารามิเตอร์การค้นหา ---------- //

const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider สำหรับเก็บและอัพเดทพารามิเตอร์การค้นหา
const UserProvider = ({
  children,
  initialParams,
}: {
  children: ReactNode;
  initialParams: UserSearchParams;
}) => {
  const [searchParams, setSearchParams] =
    useState<UserSearchParams>(initialParams);
  const [transformerSearchParams, setTransformerSearchParams] =
    useState<TransformerSearchParams>({
      page: 1,
      limit: USERS_PER_PAGE,
      search: "",
    });
  const [activeTab, setActiveTab] = useState<string>("transformers");

  const updateSearchParams = (newParams: Partial<UserSearchParams>) => {
    setSearchParams((prev) => ({ ...prev, ...newParams }));
  };

  const updateTransformerSearchParams = (
    newParams: Partial<TransformerSearchParams>,
  ) => {
    setTransformerSearchParams((prev) => ({ ...prev, ...newParams }));
  };

  return (
    <UserContext.Provider
      value={{
        searchParams,
        updateSearchParams,
        transformerSearchParams,
        updateTransformerSearchParams,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Hook สำหรับเข้าถึง Context
const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext ต้องใช้ภายใน UserProvider");
  }
  return context;
};

// ---------- Components ---------- //

// แสดงตัวโหลดระหว่างรอข้อมูล
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-600"></div>
  </div>
);

// แสดงข้อความเมื่อเกิดข้อผิดพลาด
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center mt-4">
    {message}
  </div>
);

// Navigation Tabs
const NavigationTabs = () => {
  const { activeTab, setActiveTab } = useUserContext();

  const tabs = [
    { id: "transformers", label: "จัดการหม้อแปลง", icon: "🔌" },
    { id: "users", label: "จัดการผู้ใช้", icon: "👥" },
    { id: "export", label: "Export ข้อมูล", icon: "📤" },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

// CSV Upload Component with Security Enhancements
const CSVUploadComponent = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<{
    show: boolean;
    message: string;
    percentage?: number;
    currentBatch?: number;
    totalBatches?: number;
    processedRecords?: number;
    totalRecords?: number;
  }>({ show: false, message: "" });
  const queryClient = useQueryClient();

  // Progress callback function
  const handleProgress = useCallback(
    (progress: {
      currentBatch: number;
      totalBatches: number;
      processedRecords: number;
      totalRecords: number;
      currentOperation: string;
    }) => {
      const percentage = Math.round(
        (progress.processedRecords / progress.totalRecords) * 100,
      );
      setUploadProgress({
        show: true,
        message: progress.currentOperation,
        percentage: percentage,
        currentBatch: progress.currentBatch,
        totalBatches: progress.totalBatches,
        processedRecords: progress.processedRecords,
        totalRecords: progress.totalRecords,
      });
    },
    [],
  );

  const uploadMutation = useMutation(
    async (data: Array<{ transformerNumber: string; gisDetails: string }>) => {
      setUploadProgress({
        show: true,
        message: `เริ่มประมวลผล ${data.length.toLocaleString()} รายการ...`,
        percentage: 0,
        totalRecords: data.length,
      });

      // แบ่งข้อมูลเป็น chunks สำหรับป้องกัน body size limit
      // ปรับ chunk size ตามขนาดข้อมูลสำหรับประสิทธิภาพสูงสุด
      const determineChunkSize = (totalRecords: number): number => {
        if (totalRecords < 5000) return totalRecords; // ส่งทีเดียวถ้าข้อมูลน้อย
        if (totalRecords < 20000) return 10000; // chunk ปานกลางสำหรับข้อมูลปานกลาง
        if (totalRecords < 50000) return 15000; // chunk ใหญ่สำหรับข้อมูลจำนวนมาก
        return 20000; // chunk ใหญ่สุดสำหรับข้อมูลจำนวนมากที่สุด
      };

      const CHUNK_SIZE = determineChunkSize(data.length);

      if (data.length <= CHUNK_SIZE) {
        // ถ้าข้อมูลน้อยกว่า chunk size ส่งทีเดียว
        return bulkUpsertTransformers(data);
      } else {
        // แบ่งข้อมูลเป็น chunks และส่งทีละ chunk
        const chunks = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          chunks.push(data.slice(i, i + CHUNK_SIZE));
        }

        setUploadProgress({
          show: true,
          message: `แบ่งข้อมูลเป็น ${chunks.length} ส่วน (${CHUNK_SIZE.toLocaleString()} รายการต่อส่วน) กำลังส่งส่วนที่ 1...`,
          percentage: 0,
          totalRecords: data.length,
          currentBatch: 1,
          totalBatches: chunks.length,
        });

        // ประมวลผล chunks ทีละส่วน
        const combinedResults = {
          success: true,
          results: {
            success: 0,
            updated: 0,
            created: 0,
            errors: [] as any[],
            duplicatesRemoved: 0,
            duplicatesList: [] as any[],
          },
          message: "",
        };

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkNumber = i + 1;

          setUploadProgress({
            show: true,
            message: `กำลังประมวลผลส่วนที่ ${chunkNumber}/${chunks.length} (${chunk.length.toLocaleString()} รายการ) - ใช้เทคนิค High-Performance`,
            percentage: Math.round((i / chunks.length) * 90), // เก็บ 10% สำหรับ completion
            totalRecords: data.length,
            processedRecords: i * CHUNK_SIZE,
            currentBatch: chunkNumber,
            totalBatches: chunks.length,
          });

          try {
            const chunkResult = await bulkUpsertTransformers(chunk);

            if (chunkResult.success && chunkResult.results) {
              // รวมผลลัพธ์
              combinedResults.results.success +=
                chunkResult.results.success || 0;
              combinedResults.results.updated +=
                chunkResult.results.updated || 0;
              combinedResults.results.created +=
                chunkResult.results.created || 0;
              combinedResults.results.duplicatesRemoved +=
                (chunkResult.results as any).duplicatesRemoved || 0;

              // รวม errors และ duplicates
              if (chunkResult.results.errors) {
                combinedResults.results.errors.push(
                  ...chunkResult.results.errors,
                );
              }
              if ((chunkResult.results as any).duplicatesList) {
                combinedResults.results.duplicatesList.push(
                  ...(chunkResult.results as any).duplicatesList,
                );
              }
            } else {
              // ถ้า chunk นี้ล้มเหลว
              combinedResults.success = false;
              combinedResults.results.errors.push({
                row: i * CHUNK_SIZE + 1,
                transformerNumber: `Chunk ${chunkNumber}`,
                error:
                  chunkResult.error ||
                  `เกิดข้อผิดพลาดในการประมวลผลส่วนที่ ${chunkNumber}`,
              });
            }

            // อัพเดท progress หลังเสร็จแต่ละ chunk
            const completionPercentage = Math.round(
              ((i + 1) / chunks.length) * 95,
            ); // เก็บ 5% สำหรับ final
            setUploadProgress({
              show: true,
              message: `เสร็จสิ้นส่วนที่ ${chunkNumber}/${chunks.length} - ประมวลผลด้วยเทคนิค UNNEST`,
              percentage: completionPercentage,
              totalRecords: data.length,
              processedRecords: Math.min((i + 1) * CHUNK_SIZE, data.length),
              currentBatch: chunkNumber,
              totalBatches: chunks.length,
            });
          } catch (error) {
            console.error(`Error processing chunk ${chunkNumber}:`, error);
            combinedResults.results.errors.push({
              row: i * CHUNK_SIZE + 1,
              transformerNumber: `Chunk ${chunkNumber}`,
              error: `เกิดข้อผิดพลาดในการส่งข้อมูลส่วนที่ ${chunkNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
          }
        }

        // สร้างข้อความสรุป
        combinedResults.message = `ประมวลผลแบบ High-Performance: ${data.length.toLocaleString()} รายการใน ${chunks.length} ส่วน สำเร็จ ${combinedResults.results.success.toLocaleString()} รายการ (สร้างใหม่ ${combinedResults.results.created.toLocaleString()}, อัพเดท ${combinedResults.results.updated.toLocaleString()})${combinedResults.results.duplicatesRemoved > 0 ? `, ลบข้อมูลซ้ำ ${combinedResults.results.duplicatesRemoved.toLocaleString()} รายการ` : ""}, ผิดพลาด ${combinedResults.results.errors.length.toLocaleString()} รายการ`;

        return combinedResults;
      }
    },
    {
      onSuccess: (result) => {
        setUploadResult(result);
        queryClient.invalidateQueries("transformers");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setLastUploadTime(Date.now());
        setUploadProgress({ show: false, message: "" });
      },
      onError: (error) => {
        console.error("Upload error:", error);
        setUploadResult({
          success: false,
          error: "เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่",
        });
        setUploadProgress({ show: false, message: "" });
      },
      onSettled: () => {
        setIsUploading(false);
      },
    },
  );

  const validateFileContent = useCallback(
    (content: string): { isValid: boolean; error?: string } => {
      // ตรวจสอบขนาดเนื้อหา
      if (content.length > SECURITY_LIMITS.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `ไฟล์มีขนาดเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        };
      }

      // ตรวจสอบจำนวนแถว
      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length > SECURITY_LIMITS.MAX_ROWS + 1) {
        // +1 สำหรับ header
        return {
          isValid: false,
          error: `จำนวนแถวเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_ROWS.toLocaleString()} แถว)`,
        };
      }

      // ตรวจสอบเนื้อหาที่อาจเป็นอันตราย
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload/i,
        /onerror/i,
        /eval\(/i,
        /document\./i,
        /window\./i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          return { isValid: false, error: "พบเนื้อหาที่อาจเป็นอันตรายในไฟล์" };
        }
      }

      return { isValid: true };
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // ตรวจสอบ rate limiting
      const now = Date.now();
      if (now - lastUploadTime < SECURITY_LIMITS.MIN_UPLOAD_INTERVAL) {
        const remainingTime = Math.ceil(
          (SECURITY_LIMITS.MIN_UPLOAD_INTERVAL - (now - lastUploadTime)) / 1000,
        );
        alert(`กรุณารอ ${remainingTime} วินาที ก่อนอัพโหลดใหม่`);
        return;
      }

      // ตรวจสอบประเภทไฟล์
      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("กรุณาเลือกไฟล์ CSV เท่านั้น (.csv)");
        return;
      }

      // ตรวจสอบขนาดไฟล์
      if (file.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
        alert(
          `ไฟล์มีขนาดเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        );
        return;
      }

      // ตรวจสอบ MIME type (ป้องกันการเปลี่ยนนามสกุล)
      if (
        file.type !== "text/csv" &&
        file.type !== "application/csv" &&
        file.type !== ""
      ) {
        alert("ประเภทไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ CSV เท่านั้น");
        return;
      }

      setIsUploading(true);
      setUploadResult(null);
      setUploadProgress({
        show: true,
        message: "กำลังอ่านไฟล์...",
        percentage: 10,
      });

      try {
        const text = await file.text();

        setUploadProgress({
          show: true,
          message: "กำลังตรวจสอบความปลอดภัย...",
          percentage: 20,
        });

        // ตรวจสอบความปลอดภัยของเนื้อหา
        const validation = validateFileContent(text);
        if (!validation.isValid) {
          alert(validation.error);
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }

        setUploadProgress({
          show: true,
          message: "กำลังแยกข้อมูล...",
          percentage: 30,
        });

        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          alert("ไฟล์ CSV ต้องมีอย่างน้อย 2 แถว (header + data)");
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }

        // แสดงจำนวนรายการที่พบ
        const dataRowCount = lines.length - 1;
        setUploadProgress({
          show: true,
          message: `พบข้อมูล ${dataRowCount.toLocaleString()} รายการ กำลังตรวจสอบ header...`,
          percentage: 40,
        });

        // ตรวจสอบ header
        const header = lines[0].toLowerCase();
        if (
          !header.includes("transformernumber") &&
          !header.includes("transformer")
        ) {
          alert("ไฟล์ CSV ต้องมีคอลัมน์ transformerNumber");
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }
        if (!header.includes("gisdetails") && !header.includes("gis")) {
          alert("ไฟล์ CSV ต้องมีคอลัมน์ gisDetails");
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }

        setUploadProgress({
          show: true,
          message: `กำลังประมวลผลข้อมูล ${dataRowCount.toLocaleString()} รายการ...`,
          percentage: 50,
        });

        // แปลงข้อมูลด้วย CSV parser ที่ปลอดภัยกว่า
        const data = lines
          .slice(1)
          .map((line, index) => {
            const columns = parseCSVLine(line);
            const transformerNumber = (columns[0] || "").trim();
            const gisDetails = (columns[1] || "").trim();

            // ตรวจสอบความยาวข้อมูล
            if (transformerNumber.length > SECURITY_LIMITS.MAX_FIELD_LENGTH) {
              throw new Error(
                `แถว ${index + 2}: หมายเลขหม้อแปลงยาวเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_FIELD_LENGTH} ตัวอักษร)`,
              );
            }
            if (gisDetails.length > SECURITY_LIMITS.MAX_FIELD_LENGTH) {
              throw new Error(
                `แถว ${index + 2}: รายละเอียด GIS ยาวเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_FIELD_LENGTH} ตัวอักษร)`,
              );
            }

            // ตรวจสอบรูปแบบหมายเลขหม้อแปลง (ป้องกัน injection)
            if (
              transformerNumber &&
              !/^[a-zA-Z0-9\-_\.]+$/.test(transformerNumber)
            ) {
              throw new Error(
                `แถว ${index + 2}: หมายเลขหม้อแปลงมีตัวอักษรที่ไม่อนุญาต (ใช้ได้เฉพาะ a-z, A-Z, 0-9, -, _, .)`,
              );
            }

            return {
              transformerNumber,
              gisDetails,
            };
          })
          .filter((item) => item.transformerNumber && item.gisDetails);

        if (data.length === 0) {
          alert("ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV");
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }

        // จำกัดจำนวนข้อมูลที่ประมวลผลในแต่ละครั้ง
        if (data.length > SECURITY_LIMITS.MAX_ROWS) {
          alert(
            `จำนวนข้อมูลเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_ROWS.toLocaleString()} แถว) กรุณาแบ่งไฟล์เป็นส่วนๆ`,
          );
          setIsUploading(false);
          setUploadProgress({ show: false, message: "" });
          return;
        }

        // แสดง warning สำหรับข้อมูลจำนวนมาก
        if (data.length > 10000) {
          const estimatedTime = Math.ceil(data.length / 5000); // ประมาณ 5000 รายการต่อวินาที
          const confirmed = window.confirm(
            `🚀 High-Performance Upload\n\nคุณกำลังอัพโหลดข้อมูล ${data.length.toLocaleString()} รายการ\n\n` +
              `⚡ ประมาณเวลา: ${estimatedTime} วินาที (ใช้เทคนิค UNNEST)\n` +
              `📈 เร็วกว่าระบบเดิม 10-20 เท่า!\n\n` +
              `✅ ระบบจะ:\n` +
              `• แบ่งประมวลผลอัตโนมัติ\n` +
              `• แสดงความก้าวหน้าแบบ real-time\n` +
              `• จัดการข้อมูลซ้ำอัจฉริยะ\n\n` +
              `ต้องการดำเนินการต่อหรือไม่?`,
          );
          if (!confirmed) {
            setIsUploading(false);
            setUploadProgress({ show: false, message: "" });
            return;
          }
        }

        // Simulate real-time progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev.percentage && prev.percentage < 95) {
              return {
                ...prev,
                percentage: prev.percentage + 1,
                message: `กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์... (${prev.percentage + 1}%)`,
              };
            }
            return prev;
          });
        }, 1000);

        uploadMutation.mutate(data);

        // Clear interval when upload starts
        setTimeout(() => {
          clearInterval(progressInterval);
        }, 5000);
      } catch (error) {
        console.error("Error processing CSV:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการอ่านไฟล์ CSV";
        alert(errorMessage);
        setIsUploading(false);
        setUploadProgress({ show: false, message: "" });
      }
    },
    [uploadMutation, lastUploadTime, validateFileContent],
  );

  const isRateLimited =
    Date.now() - lastUploadTime < SECURITY_LIMITS.MIN_UPLOAD_INTERVAL;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        🚀 อัพโหลดข้อมูล CSV แบบ High-Performance (เร็วสูงสุด!)
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เลือกไฟล์ CSV (รูปแบบ: transformerNumber, gisDetails)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading || isRateLimited}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          {isRateLimited && (
            <p className="text-sm text-orange-600 mt-1">
              ⏳ กรุณารอ{" "}
              {Math.ceil(
                (SECURITY_LIMITS.MIN_UPLOAD_INTERVAL -
                  (Date.now() - lastUploadTime)) /
                  1000,
              )}{" "}
              วินาที ก่อนอัพโหลดครั้งถัดไป (ป้องกันการใช้งานมากเกินไป)
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-800 mb-2">📋 รูปแบบไฟล์ CSV:</h4>
          <pre className="text-sm text-blue-700">
            {`transformerNumber,gisDetails
TR001,รายละเอียด GIS หม้อแปลง 1
TR002,รายละเอียด GIS หม้อแปลง 2`}
          </pre>
          <div className="text-sm text-blue-600 mt-2 space-y-1">
            <p>
              💡 ระบบจะอัพเดทข้อมูลหากมีหมายเลขหม้อแปลงอยู่แล้ว
              หรือสร้างใหม่หากไม่มี
            </p>
            <p>
              ⚠️ ข้อจำกัด: ไฟล์สูงสุด{" "}
              {SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB,{" "}
              {SECURITY_LIMITS.MAX_ROWS.toLocaleString()} แถว
            </p>
            <p>🔒 หมายเลขหม้อแปลงใช้ได้เฉพาะ: a-z, A-Z, 0-9, -, _, .</p>
            <p>
              🚀 ระบบ High-Performance: ใช้เทคนิค UNNEST สำหรับความเร็วสูงสุด
            </p>
            <p>
              ⚡ รองรับข้อมูลจำนวนมากสูงสุด 100,000 รายการ - เร็วกว่าเดิม 10-20
              เท่า!
            </p>
            <p>
              🔄 การจัดการข้อมูลซ้ำ: ระบบจะใช้ข้อมูลจากแถวแรกและรายงานรายการซ้ำ
            </p>
            <p>
              📊 แนะนำ: สำหรับข้อมูล 20,000+ รายการ ควรรันในช่วงที่มี network
              ที่เสถียร
            </p>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        {uploadProgress.show && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {uploadProgress.message}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {uploadProgress.percentage !== undefined && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{uploadProgress.percentage}%</span>
                    {uploadProgress.totalRecords && (
                      <span>
                        {uploadProgress.processedRecords?.toLocaleString() || 0}{" "}
                        / {uploadProgress.totalRecords.toLocaleString()} รายการ
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Batch progress */}
              {uploadProgress.currentBatch !== undefined &&
                uploadProgress.totalBatches !== undefined && (
                  <div className="text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>
                        Batch: {uploadProgress.currentBatch} /{" "}
                        {uploadProgress.totalBatches}
                      </span>
                      <span>
                        {uploadProgress.totalBatches > 1 &&
                          `${Math.round((uploadProgress.currentBatch / uploadProgress.totalBatches) * 100)}% ของ batches เสร็จแล้ว`}
                      </span>
                    </div>
                    {uploadProgress.totalBatches > 1 && (
                      <div className="bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className="bg-green-500 h-1 rounded-full transition-all duration-300"
                          style={{
                            width: `${(uploadProgress.currentBatch / uploadProgress.totalBatches) * 100}%`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {isUploading && !uploadProgress.show && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
            <span>กำลังเริ่มการประมวลผล...</span>
          </div>
        )}

        {uploadResult && (
          <div
            className={`border rounded-md p-4 ${uploadResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <h4
              className={`font-medium mb-2 ${uploadResult.success ? "text-green-800" : "text-red-800"}`}
            >
              📊 ผลลัพธ์การอัพโหลด
            </h4>
            <p
              className={`text-sm ${uploadResult.success ? "text-green-700" : "text-red-700"}`}
            >
              {uploadResult.message || uploadResult.error}
            </p>

            {uploadResult.success && uploadResult.results && (
              <div className="mt-3 space-y-2">
                {/* สถิติหลัก */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-green-100 rounded-lg p-2 text-center">
                    <div className="font-bold text-green-800">
                      {uploadResult.results.created.toLocaleString()}
                    </div>
                    <div className="text-green-600 text-xs">สร้างใหม่</div>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-2 text-center">
                    <div className="font-bold text-blue-800">
                      {uploadResult.results.updated.toLocaleString()}
                    </div>
                    <div className="text-blue-600 text-xs">อัพเดท</div>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-2 text-center">
                    <div className="font-bold text-yellow-800">
                      {(
                        uploadResult.results.duplicatesRemoved || 0
                      ).toLocaleString()}
                    </div>
                    <div className="text-yellow-600 text-xs">ข้อมูลซ้ำ</div>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-2 text-center">
                    <div className="font-bold text-purple-800">
                      {uploadResult.results.success.toLocaleString()}
                    </div>
                    <div className="text-purple-600 text-xs">สำเร็จทั้งหมด</div>
                  </div>
                </div>

                {/* ข้อมูลซ้ำ */}
                {uploadResult.results.duplicatesList &&
                  uploadResult.results.duplicatesList.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-yellow-600 font-medium">
                        🔄 ข้อมูลซ้ำที่พบ:{" "}
                        <span className="font-bold">
                          {uploadResult.results.duplicatesList.length}
                        </span>{" "}
                        หมายเลขหม้อแปลง
                      </summary>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-yellow-700 bg-yellow-50 rounded p-2">
                        {uploadResult.results.duplicatesList
                          .slice(0, 10)
                          .map((duplicate: any, idx: number) => (
                            <p key={idx}>
                              <strong>{duplicate.transformerNumber}</strong> -
                              พบในแถว {duplicate.rows.join(", ")}{" "}
                              (ใช้ข้อมูลจากแถว {duplicate.rows[0]})
                            </p>
                          ))}
                        {uploadResult.results.duplicatesList.length > 10 && (
                          <p className="italic">
                            ... และอีก{" "}
                            {(
                              uploadResult.results.duplicatesList.length - 10
                            ).toLocaleString()}{" "}
                            รายการ
                          </p>
                        )}
                      </div>
                    </details>
                  )}

                {/* ข้อผิดพลาด */}
                {uploadResult.results.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 font-medium">
                      ❌ ข้อผิดพลาด:{" "}
                      <span className="font-bold">
                        {uploadResult.results.errors.length.toLocaleString()}
                      </span>{" "}
                      รายการ
                    </summary>
                    <div className="mt-2 space-y-1 text-red-600 max-h-32 overflow-y-auto text-xs bg-red-50 rounded p-2">
                      {uploadResult.results.errors
                        .slice(0, 10)
                        .map((error: any, idx: number) => (
                          <p key={idx}>
                            แถว {error.row}:{" "}
                            <strong>{error.transformerNumber}</strong> -{" "}
                            {error.error}
                          </p>
                        ))}
                      {uploadResult.results.errors.length > 10 && (
                        <p className="italic">
                          ... และอีก{" "}
                          {(
                            uploadResult.results.errors.length - 10
                          ).toLocaleString()}{" "}
                          ข้อผิดพลาด
                        </p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Page Size Selector Component
const PageSizeSelector = ({
  currentPageSize,
  onPageSizeChange,
  totalCount,
}: {
  currentPageSize: number;
  onPageSizeChange: (size: number) => void;
  totalCount: number;
}) => {
  const pageSizeOptions = [10, 25, 50, 100];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-700">แสดง</span>
      <select
        value={currentPageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {pageSizeOptions.map((size) => (
          <option
            key={size}
            value={size}
            disabled={size > totalCount && totalCount > 0}
          >
            {size}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-700">รายการต่อหน้า</span>
    </div>
  );
};

// Transformer Table Components
const TransformerSearchBar = () => {
  const { transformerSearchParams, updateTransformerSearchParams } =
    useUserContext();
  const [searchValue, setSearchValue] = useState(
    transformerSearchParams.search,
  );

  const { data } = useQuery(
    ["transformers", transformerSearchParams],
    () =>
      getTransformers(
        transformerSearchParams.page,
        transformerSearchParams.limit,
        transformerSearchParams.search,
      ),
    {
      keepPreviousData: true,
    },
  );

  const handleSearchChange = debounce((value: string) => {
    updateTransformerSearchParams({ search: value, page: 1 });
  }, 300);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    handleSearchChange(value);
  };

  const handlePageSizeChange = (newSize: number) => {
    updateTransformerSearchParams({ limit: newSize, page: 1 });
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 ค้นหาด้วยหมายเลขหม้อแปลงหรือรายละเอียด GIS"
            value={searchValue}
            onChange={onSearchInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* แสดง PageSizeSelector เมื่อมีข้อมูล */}
      {data && data.totalCount > 0 && (
        <div className="flex justify-between items-center">
          <PageSizeSelector
            currentPageSize={transformerSearchParams.limit}
            onPageSizeChange={handlePageSizeChange}
            totalCount={data.totalCount}
          />
          <div className="text-sm text-gray-600">
            ทั้งหมด {data.totalCount} รายการ
          </div>
        </div>
      )}
    </div>
  );
};

const TransformerRow = ({
  transformer,
  index,
  onEdit,
  onDelete,
}: {
  transformer: Transformer;
  index: number;
  onEdit: (transformer: Transformer) => void;
  onDelete: (id: number) => void;
}) => {
  return (
    <tr
      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors duration-150`}
    >
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {transformer.transformerNumber}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
        {transformer.gisDetails}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(transformer.createdAt).toLocaleDateString("th-TH")}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(transformer.updatedAt).toLocaleDateString("th-TH")}
      </td>
      <td className="px-6 py-4">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(transformer)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200 text-sm"
          >
            ✏️ แก้ไข
          </button>
          <button
            onClick={() => onDelete(transformer.id)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200 text-sm"
          >
            🗑️ ลบ
          </button>
        </div>
      </td>
    </tr>
  );
};

const TransformerTable = ({
  onEdit,
}: {
  onEdit: (transformer: Transformer) => void;
}) => {
  const { transformerSearchParams } = useUserContext();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ["transformers", transformerSearchParams],
    () =>
      getTransformers(
        transformerSearchParams.page,
        transformerSearchParams.limit,
        transformerSearchParams.search,
      ),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  const deleteMutation = useMutation((id: number) => deleteTransformer(id), {
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries("transformers");
      } else {
        alert(result.error);
      }
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบหม้อแปลงนี้?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="ไม่สามารถโหลดข้อมูลหม้อแปลงได้" />;
  if (!data?.transformers || data.transformers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🔌</div>
        <p className="text-gray-500 text-lg">ไม่พบข้อมูลหม้อแปลง</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                หมายเลขหม้อแปลง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                รายละเอียด GIS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                วันที่สร้าง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                วันที่แก้ไข
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.transformers.map((transformer, index) => (
              <TransformerRow
                key={transformer.id}
                transformer={transformer}
                index={index}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TransformerPagination = () => {
  const { transformerSearchParams, updateTransformerSearchParams } =
    useUserContext();

  const { data } = useQuery(
    ["transformers", transformerSearchParams],
    () =>
      getTransformers(
        transformerSearchParams.page,
        transformerSearchParams.limit,
        transformerSearchParams.search,
      ),
    {
      keepPreviousData: true,
    },
  );

  if (!data || data.totalPages <= 1) return null;

  const currentPage = transformerSearchParams.page;
  const totalPages = data.totalPages;

  // สร้างหมายเลขหน้าที่จะแสดง
  const getPageNumbers = () => {
    const delta = 2; // จำนวนหน้าที่แสดงรอบๆ หน้าปัจจุบัน
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        {/* แสดงข้อมูลสถิติ */}
        <div className="text-sm text-gray-700">
          แสดง{" "}
          <span className="font-medium">
            {(currentPage - 1) * transformerSearchParams.limit + 1}
          </span>{" "}
          ถึง{" "}
          <span className="font-medium">
            {Math.min(
              currentPage * transformerSearchParams.limit,
              data.totalCount,
            )}
          </span>{" "}
          จากทั้งหมด <span className="font-medium">{data.totalCount}</span>{" "}
          รายการ
        </div>

        {/* ปุ่ม Pagination */}
        <nav className="flex space-x-1">
          {/* ปุ่มไปหน้าแรก */}
          <button
            onClick={() => updateTransformerSearchParams({ page: 1 })}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าแรก"
          >
            ⟪
          </button>

          {/* ปุ่มไปหน้าก่อนหน้า */}
          <button
            onClick={() =>
              updateTransformerSearchParams({ page: currentPage - 1 })
            }
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าก่อนหน้า"
          >
            ‹
          </button>

          {/* หมายเลขหน้า */}
          {pageNumbers.map((pageNumber, index) => (
            <button
              key={index}
              onClick={() => {
                if (typeof pageNumber === "number") {
                  updateTransformerSearchParams({ page: pageNumber });
                }
              }}
              disabled={pageNumber === "..."}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                pageNumber === currentPage
                  ? "bg-blue-600 text-white border border-blue-600"
                  : pageNumber === "..."
                    ? "bg-white text-gray-400 cursor-default"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          {/* ปุ่มไปหน้าถัดไป */}
          <button
            onClick={() =>
              updateTransformerSearchParams({ page: currentPage + 1 })
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าถัดไป"
          >
            ›
          </button>

          {/* ปุ่มไปหน้าสุดท้าย */}
          <button
            onClick={() => updateTransformerSearchParams({ page: totalPages })}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าสุดท้าย"
          >
            ⟫
          </button>
        </nav>
      </div>
    </div>
  );
};

// Main Transformer Management Component
const TransformerManagement = () => {
  const [editingTransformer, setEditingTransformer] =
    useState<Transformer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    (data: { transformerNumber: string; gisDetails: string }) =>
      createTransformer(data),
    {
      onSuccess: (result) => {
        if (result.success) {
          queryClient.invalidateQueries("transformers");
          setShowForm(false);
        } else {
          alert(result.error);
        }
      },
    },
  );

  const updateMutation = useMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: { transformerNumber: string; gisDetails: string };
    }) => updateTransformer(id, data),
    {
      onSuccess: (result) => {
        if (result.success) {
          queryClient.invalidateQueries("transformers");
          setEditingTransformer(null);
          setShowForm(false);
        } else {
          alert(result.error);
        }
      },
    },
  );

  const handleSubmit = (data: {
    transformerNumber: string;
    gisDetails: string;
  }) => {
    if (editingTransformer) {
      updateMutation.mutate({ id: editingTransformer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transformer: Transformer) => {
    setEditingTransformer(transformer);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingTransformer(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🔌 จัดการข้อมูลหม้อแปลง
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
        >
          ➕ เพิ่มหม้อแปลงใหม่
        </button>
      </div>

      <CSVUploadComponent />

      {showForm && (
        <TransformerForm
          transformer={editingTransformer || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      <TransformerSearchBar />
      <TransformerTable onEdit={handleEdit} />
      <TransformerPagination />
    </div>
  );
};

// Export Data Component (รักษาไว้เหมือนเดิม)
const ExportDataComponent = () => {
  const [dateFrom, setDateFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: powerOutageData } = useQuery(
    ["power-outage-export"],
    () => getPowerOutageRequests(),
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  );

  const handleExport = useCallback(async () => {
    if (!powerOutageData || !powerOutageData.data) return;

    setIsExporting(true);
    try {
      const filteredData = powerOutageData.data.filter((item: any) => {
        const outageDate = new Date(item.outageDate);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        return outageDate >= fromDate && outageDate <= toDate;
      });

      const csvHeaders = [
        "วันที่ดับไฟ",
        "เวลาเริ่ม",
        "เวลาสิ้นสุด",
        "หม้อแปลง",
        "รายละเอียด GIS",
        "พื้นที่",
        "จุดรวมงาน",
        "สังกัด",
        "ผู้สร้าง",
        "สถานะคำขอ",
        "สถานะ OMS",
        "วันที่สร้าง",
      ];

      const csvData = filteredData.map((item: any) => [
        new Date(item.outageDate).toLocaleDateString("th-TH"),
        new Date(item.startTime).toLocaleTimeString("th-TH"),
        new Date(item.endTime).toLocaleTimeString("th-TH"),
        item.transformerNumber,
        item.gisDetails,
        item.area || "",
        item.workCenter.name,
        item.branch.shortName,
        item.createdBy.fullName,
        item.statusRequest,
        item.omsStatus,
        new Date(item.createdAt).toLocaleDateString("th-TH"),
      ]);

      const csvContent = [csvHeaders, ...csvData]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(","))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `power-outage-requests_${dateFrom}_${dateTo}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการ Export ข้อมูล");
    } finally {
      setIsExporting(false);
    }
  }, [powerOutageData, dateFrom, dateTo]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Export ข้อมูลคำขอดับไฟ
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            วันที่เริ่มต้น
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            วันที่สิ้นสุด
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleExport}
            disabled={isExporting || !powerOutageData}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            {isExporting ? "กำลัง Export..." : "📤 Export เป็น CSV"}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-md p-4">
        <h3 className="font-medium text-gray-800 mb-2">ข้อมูลที่จะ Export</h3>
        <p className="text-sm text-gray-600">
          จำนวนรายการทั้งหมด:{" "}
          <span className="font-medium">
            {powerOutageData?.pagination?.total || 0}
          </span>{" "}
          รายการ
        </p>
        <p className="text-sm text-gray-600 mt-1">
          ไฟล์จะรวมข้อมูล: วันที่ดับไฟ, เวลา, สาเหตุ, รายละเอียด, หม้อแปลง,
          จุดรวมงาน, สถานะ และอื่นๆ
        </p>
      </div>
    </div>
  );
};

// User Management Components (เพิ่มใหม่)
const SearchBar = () => {
  const { searchParams, updateSearchParams } = useUserContext();
  const [searchValue, setSearchValue] = useState(searchParams.search);

  const { data: workCenters = [], isLoading } = useQuery(
    ["workCenters"],
    async () => {
      try {
        const result = await getWorkCenters();
        return Array.isArray(result) ? result.map((item) => ({ ...item })) : [];
      } catch (error) {
        console.error("Error fetching work centers:", error);
        return [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const { data: usersData } = useQuery(
    ["users", searchParams],
    () =>
      getUsers(
        searchParams.page,
        searchParams.limit,
        searchParams.search,
        searchParams.workCenterId,
      ),
    {
      keepPreviousData: true,
    },
  );

  const handleSearchChange = debounce((value: string) => {
    updateSearchParams({ search: value, page: 1 });
  }, 300);

  const handleWorkCenterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateSearchParams({ workCenterId: value, page: 1 });
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    handleSearchChange(value);
  };

  const handlePageSizeChange = (newSize: number) => {
    updateSearchParams({ limit: newSize, page: 1 });
  };

  if (isLoading) return <div>กำลังโหลดข้อมูลจุดรวมงาน...</div>;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 ค้นหาด้วยรหัสพนักงานหรือชื่อ"
            value={searchValue}
            onChange={onSearchInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:w-64">
          <select
            value={searchParams.workCenterId || ""}
            onChange={handleWorkCenterChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทุกจุดรวมงาน</option>
            {workCenters.map((center) => (
              <option key={center.id} value={center.id.toString()}>
                {center.name}
              </option>
            ))}
          </select>
        </div>
        <Link href="/admin/create-user">
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200 whitespace-nowrap">
            ➕ สร้าง User ใหม่
          </button>
        </Link>
      </div>

      {/* แสดง PageSizeSelector เมื่อมีข้อมูล */}
      {usersData && usersData.totalCount > 0 && (
        <div className="flex justify-between items-center">
          <PageSizeSelector
            currentPageSize={searchParams.limit}
            onPageSizeChange={handlePageSizeChange}
            totalCount={usersData.totalCount}
          />
          <div className="text-sm text-gray-600">
            ทั้งหมด {usersData.totalCount} รายการ
          </div>
        </div>
      )}
    </div>
  );
};

const UserRow = ({ user, index }: { user: User; index: number }) => {
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation(
    ({ userId, newRole }: { userId: number; newRole: Role }) =>
      updateUserRole(userId, newRole),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("users");
      },
    },
  );

  const resetPasswordMutation = useMutation(
    (userId: number) => resetUserPassword(userId),
    {
      onSuccess: (result) => {
        if (result.success) {
          alert(`✅ ${result.message}`);
        } else {
          alert(`❌ เกิดข้อผิดพลาด: ${result.error}`);
        }
      },
      onError: () => {
        alert("❌ เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
      },
    },
  );

  const deleteMutation = useMutation((userId: number) => deleteUser(userId), {
    onSuccess: () => {
      queryClient.invalidateQueries("users");
    },
  });

  const handleRoleChange = (userId: number, newRole: Role) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const handleResetPassword = (
    userId: number,
    employeeId: string,
    fullName: string,
  ) => {
    const confirmed = window.confirm(
      `🔐 รีเซ็ตรหัสผ่าน\n\nต้องการรีเซ็ตรหัสผ่านของ "${fullName}" หรือไม่?\n\nรหัสผ่านใหม่จะเป็น: ${employeeId}\n\n⚠️ ผู้ใช้จะต้องเข้าสู่ระบบด้วยรหัสผ่านใหม่`,
    );
    if (confirmed) {
      resetPasswordMutation.mutate(userId);
    }
  };

  const handleDelete = (userId: number) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <tr
      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors duration-150`}
    >
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {user.employeeId}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.fullName}</td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {user.workCenter.name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {user.branch.fullName}
      </td>
      <td className="px-6 py-4">
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
          className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={updateRoleMutation.isLoading}
        >
          {Object.entries(ROLE_TRANSLATIONS).map(([role, label]) => (
            <option key={role} value={role}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4">
        <div className="flex space-x-2">
          <button
            onClick={() =>
              handleResetPassword(user.id, user.employeeId, user.fullName)
            }
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200 text-sm"
            disabled={resetPasswordMutation.isLoading}
            title={`รีเซ็ตรหัสผ่านเป็น: ${user.employeeId}`}
          >
            {resetPasswordMutation.isLoading ? "⏳" : "🔐 รีเซ็ต"}
          </button>
          <button
            onClick={() => handleDelete(user.id)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200 text-sm"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? "กำลังลบ..." : "🗑️ ลบ"}
          </button>
        </div>
      </td>
    </tr>
  );
};

const UserTable = () => {
  const { searchParams } = useUserContext();

  const { data, isLoading, error } = useQuery(
    ["users", searchParams],
    () =>
      getUsers(
        searchParams.page,
        searchParams.limit,
        searchParams.search,
        searchParams.workCenterId,
      ),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="ไม่สามารถโหลดข้อมูลผู้ใช้ได้" />;
  if (!data?.users || data.users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">👥</div>
        <p className="text-gray-500 text-lg">ไม่พบข้อมูลผู้ใช้</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                รหัสพนักงาน
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                ชื่อ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                จุดรวมงาน
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                สังกัด
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                บทบาท
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.users.map((user, index) => (
              <UserRow key={user.id} user={user} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Pagination = () => {
  const { searchParams, updateSearchParams } = useUserContext();

  const { data } = useQuery(
    ["users", searchParams],
    () =>
      getUsers(
        searchParams.page,
        searchParams.limit,
        searchParams.search,
        searchParams.workCenterId,
      ),
    {
      keepPreviousData: true,
    },
  );

  if (!data || data.totalPages <= 1) return null;

  const currentPage = searchParams.page;
  const totalPages = data.totalPages;

  // สร้างหมายเลขหน้าที่จะแสดง
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        {/* แสดงข้อมูลสถิติ */}
        <div className="text-sm text-gray-700">
          แสดง{" "}
          <span className="font-medium">
            {(currentPage - 1) * searchParams.limit + 1}
          </span>{" "}
          ถึง{" "}
          <span className="font-medium">
            {Math.min(currentPage * searchParams.limit, data.totalCount)}
          </span>{" "}
          จากทั้งหมด <span className="font-medium">{data.totalCount}</span>{" "}
          รายการ
        </div>

        {/* ปุ่ม Pagination */}
        <nav className="flex space-x-1">
          {/* ปุ่มไปหน้าแรก */}
          <button
            onClick={() => updateSearchParams({ page: 1 })}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าแรก"
          >
            ⟪
          </button>

          {/* ปุ่มไปหน้าก่อนหน้า */}
          <button
            onClick={() => updateSearchParams({ page: currentPage - 1 })}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าก่อนหน้า"
          >
            ‹
          </button>

          {/* หมายเลขหน้า */}
          {pageNumbers.map((pageNumber, index) => (
            <button
              key={index}
              onClick={() => {
                if (typeof pageNumber === "number") {
                  updateSearchParams({ page: pageNumber });
                }
              }}
              disabled={pageNumber === "..."}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                pageNumber === currentPage
                  ? "bg-blue-600 text-white border border-blue-600"
                  : pageNumber === "..."
                    ? "bg-white text-gray-400 cursor-default"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          {/* ปุ่มไปหน้าถัดไป */}
          <button
            onClick={() => updateSearchParams({ page: currentPage + 1 })}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าถัดไป"
          >
            ›
          </button>

          {/* ปุ่มไปหน้าสุดท้าย */}
          <button
            onClick={() => updateSearchParams({ page: totalPages })}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            title="หน้าสุดท้าย"
          >
            ⟫
          </button>
        </nav>
      </div>
    </div>
  );
};

// Transformer Form Component
const TransformerForm = ({
  transformer,
  onSubmit,
  onCancel,
}: {
  transformer?: Transformer;
  onSubmit: (data: { transformerNumber: string; gisDetails: string }) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    transformerNumber: transformer?.transformerNumber || "",
    gisDetails: transformer?.gisDetails || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.transformerNumber.trim() && formData.gisDetails.trim()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {transformer ? "✏️ แก้ไขข้อมูลหม้อแปลง" : "➕ เพิ่มหม้อแปลงใหม่"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            หมายเลขหม้อแปลง *
          </label>
          <input
            type="text"
            value={formData.transformerNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                transformerNumber: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="เช่น TR001"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            รายละเอียด GIS *
          </label>
          <textarea
            value={formData.gisDetails}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, gisDetails: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ระบุรายละเอียด GIS ของหม้อแปลง"
            rows={3}
            required
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            {transformer ? "💾 บันทึกการแก้ไข" : "➕ เพิ่มหม้อแปลง"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            ❌ ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Content Component
const MainContent = () => {
  const { activeTab } = useUserContext();

  switch (activeTab) {
    case "transformers":
      return <TransformerManagement />;
    case "users":
      return (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            👥 จัดการผู้ใช้
          </h2>
          <SearchBar />
          <UserTable />
          <Pagination />
        </div>
      );
    case "export":
      return <ExportDataComponent />;
    default:
      return <TransformerManagement />;
  }
};

// เนื้อหาหลักของหน้า
function UserPageContent() {
  const initialSearchParams: UserSearchParams = {
    page: 1,
    limit: USERS_PER_PAGE,
    search: "",
  };

  return (
    <UserProvider initialParams={initialSearchParams}>
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                ⚙️ Admin Panel
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                จัดการระบบและผู้ใช้งาน
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <NavigationTabs />
          <MainContent />
        </div>
      </div>
    </UserProvider>
  );
}

// คอมโพเนนต์หลักพร้อม React Query
export default function UserPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30000,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <UserPageContent />
    </QueryClientProvider>
  );
}
