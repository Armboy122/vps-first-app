/**
 * แยกวิเคราะห์บรรทัด CSV และจัดการ quoted fields อย่างถูกต้อง
 * @param line บรรทัด CSV ที่ต้องการแยกวิเคราะห์
 * @returns array ของ fields ที่แยกวิเคราะห์แล้ว
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * ตรวจสอบความถูกต้องของข้อมูล Transformer
 * @param data ข้อมูลที่ต้องการตรวจสอบ
 * @returns object ที่บอกผลการตรวจสอบ
 */
export function validateTransformerData(data: {
  transformerNumber: string;
  gisDetails: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.transformerNumber || data.transformerNumber.trim() === "") {
    errors.push("หมายเลขหม้อแปลงไม่สามารถเป็นค่าว่างได้");
  }

  if (!data.gisDetails || data.gisDetails.trim() === "") {
    errors.push("รายละเอียด GIS ไม่สามารถเป็นค่าว่างได้");
  }

  if (data.transformerNumber && data.transformerNumber.length > 50) {
    errors.push("หมายเลขหม้อแปลงยาวเกินไป (สูงสุด 50 ตัวอักษร)");
  }

  if (data.gisDetails && data.gisDetails.length > 500) {
    errors.push("รายละเอียด GIS ยาวเกินไป (สูงสุด 500 ตัวอักษร)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านง่าย
 * @param bytes ขนาดไฟล์ในหน่วย bytes
 * @returns string ที่แสดงขนาดไฟล์
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * สร้าง CSV content สำหรับการ export
 * @param data array ของข้อมูลที่ต้องการ export
 * @param headers array ของ header columns
 * @returns CSV content เป็น string
 */
export function generateCSVContent(
  data: Record<string, any>[],
  headers: string[],
): string {
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.join(","));
  
  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] || "";
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(",") ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(","));
  });
  
  return csvRows.join("\n");
}