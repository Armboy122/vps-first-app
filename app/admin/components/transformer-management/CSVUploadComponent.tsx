import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpsertTransformers } from "@/app/api/action/User";
import { SECURITY_LIMITS } from "../../constants/admin.constants";
import { parseCSVLine, validateTransformerData, formatFileSize } from "../../utils/csvParser";
import { CSVUploadProgress } from "../../types/admin.types";

export function CSVUploadComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<CSVUploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    errors: [],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Bulk upload mutation
  const uploadMutation = useMutation({
    mutationFn: (transformers: Array<{ transformerNumber: string; gisDetails: string }>) =>
      bulkUpsertTransformers(transformers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      setUploadProgress(prev => ({
        ...prev,
        isUploading: false,
        errors: [error.message || "เกิดข้อผิดพลาดในการอัพโหลด"],
      }));
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setUploadProgress({
      isUploading: false,
      progress: 0,
      total: 0,
      errors: [],
    });

    // Validate file type
    if (!SECURITY_LIMITS.ALLOWED_FILE_TYPES.some(type => file.name.toLowerCase().endsWith(type))) {
      setUploadProgress(prev => ({
        ...prev,
        errors: ["รองรับเฉพาะไฟล์ .csv เท่านั้น"],
      }));
      return;
    }

    // Validate file size
    const maxSizeBytes = SECURITY_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadProgress(prev => ({
        ...prev,
        errors: [`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${SECURITY_LIMITS.MAX_FILE_SIZE_MB}MB)`],
      }));
      return;
    }

    setSelectedFile(file);
  };

  // Parse and validate CSV content
  const parseCSVFile = async (file: File): Promise<Array<{ transformerNumber: string; gisDetails: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split("\n").filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error("ไฟล์ว่างเปล่า"));
            return;
          }

          // Skip header if exists
          const dataLines = lines.slice(1);
          
          if (dataLines.length > SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD) {
            reject(new Error(`จำนวนรายการเกินขึ้นได้ (สูงสุด ${SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD} รายการ)`));
            return;
          }

          const transformers: Array<{ transformerNumber: string; gisDetails: string }> = [];
          const validationErrors: string[] = [];

          dataLines.forEach((line, index) => {
            const lineNumber = index + 2; // +2 because we skipped header and array is 0-indexed
            
            try {
              const fields = parseCSVLine(line.trim());
              
              if (fields.length < 2) {
                validationErrors.push(`บรรทัด ${lineNumber}: ข้อมูลไม่ครบ (ต้องมี 2 คอลัมน์)`);
                return;
              }

              const transformerData = {
                transformerNumber: fields[0]?.trim() || "",
                gisDetails: fields[1]?.trim() || "",
              };

              const validation = validateTransformerData(transformerData);
              if (!validation.isValid) {
                validationErrors.push(`บรรทัด ${lineNumber}: ${validation.errors.join(", ")}`);
                return;
              }

              transformers.push(transformerData);
            } catch (error) {
              validationErrors.push(`บรรทัด ${lineNumber}: รูปแบบข้อมูลไม่ถูกต้อง`);
            }
          });

          if (validationErrors.length > 0) {
            setUploadProgress(prev => ({
              ...prev,
              errors: validationErrors.slice(0, 10), // Show first 10 errors
            }));
            reject(new Error("พบข้อผิดพลาดในการตรวจสอบข้อมูล"));
            return;
          }

          if (transformers.length === 0) {
            reject(new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์"));
            return;
          }

          resolve(transformers);
        } catch (error) {
          reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
        }
      };

      reader.onerror = () => reject(new Error("เกิดข้อผิดพลาดในการอ่านไฟล์"));
      reader.readAsText(file, "UTF-8");
    });
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress({
      isUploading: true,
      progress: 0,
      total: 0,
      errors: [],
    });

    try {
      const transformers = await parseCSVFile(selectedFile);
      
      setUploadProgress(prev => ({
        ...prev,
        total: transformers.length,
      }));

      await uploadMutation.mutateAsync(transformers);
      
      setUploadProgress(prev => ({
        ...prev,
        progress: transformers.length,
      }));
      
    } catch (error) {
      if (error instanceof Error) {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          errors: [error.message],
        }));
      }
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedFile(null);
    setUploadProgress({
      isUploading: false,
      progress: 0,
      total: 0,
      errors: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          📊 นำเข้าข้อมูลจากไฟล์ CSV
        </h3>
        <p className="text-sm text-gray-600">
          อัพโหลดไฟล์ CSV เพื่อเพิ่มหม้อแปลงหลายรายการพร้อมกัน
        </p>
      </div>

      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เลือกไฟล์ CSV
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={uploadProgress.isUploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        
        <div className="mt-2 text-xs text-gray-500">
          รองรับไฟล์ .csv ขนาดไม่เกิน {SECURITY_LIMITS.MAX_FILE_SIZE_MB}MB 
          และไม่เกิน {SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD.toLocaleString()} รายการ
        </div>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-blue-700">
                ขนาด: {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleUpload}
                disabled={uploadProgress.isUploading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadProgress.isUploading ? "กำลังอัพโหลด..." : "อัพโหลด"}
              </button>
              
              <button
                onClick={handleClear}
                disabled={uploadProgress.isUploading}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
              >
                ล้าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.isUploading && uploadProgress.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>กำลังประมวลผล...</span>
            <span>{uploadProgress.progress}/{uploadProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: uploadProgress.total > 0 
                  ? `${(uploadProgress.progress / uploadProgress.total) * 100}%` 
                  : "0%"
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadProgress.progress > 0 && !uploadProgress.isUploading && uploadProgress.errors.length === 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✅ อัพโหลดสำเร็จ! ประมวลผล {uploadProgress.progress} รายการแล้ว
          </p>
        </div>
      )}

      {/* Errors */}
      {uploadProgress.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 text-sm font-medium mb-2">ข้อผิดพลาด:</h4>
          <ul className="text-red-700 text-xs space-y-1 max-h-32 overflow-y-auto">
            {uploadProgress.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
          {uploadProgress.errors.length === 10 && (
            <p className="text-red-600 text-xs mt-2">
              ... และอาจมีข้อผิดพลาดเพิ่มเติม
            </p>
          )}
        </div>
      )}

      {/* CSV Format Guide */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">รูปแบบไฟล์ CSV:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• คอลัมน์ที่ 1: หมายเลขหม้อแปลง</p>
          <p>• คอลัมน์ที่ 2: รายละเอียด GIS</p>
          <p>• บรรทัดแรกจะถูกข้ามไป (header)</p>
          <p>• ใช้เครื่องหมาย comma (,) คั่นระหว่างคอลัมน์</p>
        </div>
        
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 font-mono">
          หมายเลขหม้อแปลง,รายละเอียด GIS<br/>
          TR001,&quot;สายป้อน A1 บ้านเก่า&quot;<br/>
          TR002,&quot;สายป้อน B2 ตลาดใหม่&quot;
        </div>
      </div>
    </div>
  );
}