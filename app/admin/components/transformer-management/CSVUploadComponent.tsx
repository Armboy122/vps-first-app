import { uploadTransformerRows } from "@/lib/services/transformerUpload";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpsertTransformers } from "@/app/api/action/User";
import { SECURITY_LIMITS } from "../../constants/admin.constants";
import { validateTransformerData, formatFileSize } from "../../utils/csvParser";
import { CSVUploadProgress } from "../../types/admin.types";
import { FileUp } from "lucide-react";
import { assertCsvHeader, decodeUtf8Csv, parseCsvDocument } from "@/lib/utils/csvDocument";

export function CSVUploadComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<CSVUploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    errors: [],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [skippedRows, setSkippedRows] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Bulk upload mutation
  const uploadMutation = useMutation({
    mutationFn: (transformers: Array<{ transformerNumber: string; gisDetails: string }>) =>
      bulkUpsertTransformers(transformers),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transformers"] }),

  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setSelectedFile(null);
    setUploadSummary(null);
    setSkippedRows([]);
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
  const parseCSVFile = async (file: File): Promise<Array<{ transformerNumber: string; gisDetails: string; physicalRow: number }>> => {
    const records = parseCsvDocument(decodeUtf8Csv(await file.arrayBuffer()));
    if (records.length < 2) throw new Error("ไฟล์ต้องมี header และข้อมูลอย่างน้อย 1 รายการ");
    assertCsvHeader(records[0].values, [
      ["หมายเลขหม้อแปลง", "รายละเอียด GIS"],
      ["transformerNumber", "gisDetails"],
    ]);
    const dataRecords = records.slice(1);
    if (dataRecords.length > SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD) {
      throw new Error(`จำนวนรายการเกินกำหนด (สูงสุด ${SECURITY_LIMITS.MAX_ROWS_PER_UPLOAD} รายการ)`);
    }

    const transformers: Array<{ transformerNumber: string; gisDetails: string; physicalRow: number }> = [];
    const validationErrors: string[] = [];
    for (const record of dataRecords) {
      const [number = "", gis = ""] = record.values;
      if (record.values.length !== 2) {
        validationErrors.push(`บรรทัด ${record.physicalRow}: ต้องมี 2 คอลัมน์`);
        continue;
      }
      const transformerData = { transformerNumber: number.trim(), gisDetails: gis.trim(), physicalRow: record.physicalRow };
      const validation = validateTransformerData(transformerData);
      if (!validation.isValid) validationErrors.push(`บรรทัด ${record.physicalRow}: ${validation.errors.join(", ")}`);
      else transformers.push(transformerData);
    }
    if (validationErrors.length) {
      throw new Error([`พบข้อผิดพลาด ${validationErrors.length} แถว โปรดแก้ไขก่อนนำเข้า`, ...validationErrors.slice(0, 10)].join("\n"));
    }
    if (transformers.length === 0) throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์");
    return transformers;
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

    setUploadSummary(null);
    setSkippedRows([]);
    try {
      const transformers = await parseCSVFile(selectedFile);
      const summary = await uploadTransformerRows(transformers, (chunk) => uploadMutation.mutateAsync(chunk), (saved, total) => {
        setUploadProgress((prev) => ({ ...prev, progress: saved, total }));
      });
      setUploadSummary(`ยืนยันการบันทึก ${summary.saved} จาก ${summary.unique} รายการไม่ซ้ำ (เพิ่ม ${summary.created}, อัปเดต ${summary.updated}), ข้ามซ้ำ ${summary.duplicates.length} รายการ${summary.errors.length ? `, ยังไม่ยืนยัน ${summary.unique - summary.saved} รายการ` : ""}`);
      setSkippedRows(summary.duplicates.slice(0, 10).map((row) => `บรรทัด ${row.physicalRow}: ${row.transformerNumber} ซ้ำ ใช้ข้อมูลบรรทัด ${row.firstPhysicalRow}`));
      setUploadProgress((prev) => ({ ...prev, isUploading: false, progress: summary.saved, total: summary.unique, errors: summary.errors.slice(0, 10) }));
      if (summary.errors.length === 0 && summary.saved === summary.unique) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadProgress((prev) => ({ ...prev, isUploading: false, errors: error instanceof Error ? error.message.split("\n") : ["ไม่สามารถอ่านไฟล์ได้"] }));
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedFile(null);
    setUploadSummary(null);
    setSkippedRows([]);
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
    <div className="ui-panel p-6">
      <div className="mb-4">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileUp className="h-5 w-5 text-pea-700" /> นำเข้าข้อมูลจากไฟล์ CSV
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
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-pea-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-pea-800 hover:file:bg-pea-100 disabled:opacity-50"
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

      {uploadSummary && <p className="mb-4 text-sm text-gray-700">{uploadSummary}</p>}
      {skippedRows.length > 0 && <ul className="mb-4 rounded bg-amber-50 p-3 text-xs text-amber-800">{skippedRows.map((row) => <li key={row}>{row}</li>)}</ul>}

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
