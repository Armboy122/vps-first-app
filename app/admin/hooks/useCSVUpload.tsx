import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpsertTransformers } from "@/app/api/action/User";
import { SECURITY_LIMITS } from "../constants/admin.constants";
import { parseCSVLine, validateTransformerData } from "../utils/csvParser";
import { CSVUploadProgress } from "../types/admin.types";

/**
 * Custom hook สำหรับจัดการ CSV upload functionality
 */
export function useCSVUpload() {
  const [uploadProgress, setUploadProgress] = useState<CSVUploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    errors: [],
  });

  const queryClient = useQueryClient();

  // Bulk upload mutation
  const uploadMutation = useMutation({
    mutationFn: (transformers: Array<{ transformerNumber: string; gisDetails: string }>) =>
      bulkUpsertTransformers(transformers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
    },
    onError: (error) => {
      setUploadProgress(prev => ({
        ...prev,
        isUploading: false,
        errors: [error.message || "เกิดข้อผิดพลาดในการอัพโหลด"],
      }));
    },
  });

  // Validate file
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    if (!SECURITY_LIMITS.ALLOWED_FILE_TYPES.some(type => file.name.toLowerCase().endsWith(type))) {
      return { isValid: false, error: "รองรับเฉพาะไฟล์ .csv เท่านั้น" };
    }

    // Check file size
    const maxSizeBytes = SECURITY_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { 
        isValid: false, 
        error: `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${SECURITY_LIMITS.MAX_FILE_SIZE_MB}MB)` 
      };
    }

    return { isValid: true };
  };

  // Parse CSV file
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

  // Upload file
  const uploadFile = async (file: File) => {
    // Reset state
    setUploadProgress({
      isUploading: true,
      progress: 0,
      total: 0,
      errors: [],
    });

    try {
      const transformers = await parseCSVFile(file);
      
      setUploadProgress(prev => ({
        ...prev,
        total: transformers.length,
      }));

      await uploadMutation.mutateAsync(transformers);
      
      setUploadProgress(prev => ({
        ...prev,
        progress: transformers.length,
      }));
      
      return { success: true, count: transformers.length };
    } catch (error) {
      if (error instanceof Error) {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          errors: [error.message],
        }));
      }
      throw error;
    }
  };

  // Reset state
  const reset = () => {
    setUploadProgress({
      isUploading: false,
      progress: 0,
      total: 0,
      errors: [],
    });
  };

  return {
    uploadProgress,
    validateFile,
    uploadFile,
    reset,
    isUploading: uploadMutation.isPending,
  };
}