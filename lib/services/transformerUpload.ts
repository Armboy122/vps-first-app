import { deduplicateTransformerRows } from "../utils/transformerImport";
export interface TransformerUploadRow {
    transformerNumber: string;
    gisDetails: string;
    physicalRow: number;
}
interface SaveResult {
    success: boolean;
    error?: string;
    results?: {
        success: number;
        created: number;
        updated: number;
        errors: Array<{
            row: number;
            error: string;
        }>;
    };
}
/** Whole-file first-wins deduplication precedes any bounded Action requests. */
export async function uploadTransformerRows(rows: TransformerUploadRow[], save: (rows: Array<{
    transformerNumber: string;
    gisDetails: string;
}>) => Promise<SaveResult>, onCommitted: (saved: number, total: number) => void = () => { }) {
    const { uniqueRows, duplicates } = deduplicateTransformerRows(rows);
    const summary = { total: rows.length, unique: uniqueRows.length, saved: 0, created: 0, updated: 0, duplicates, errors: [] as string[] };
    for (let start = 0; start < uniqueRows.length; start += 250) {
        const chunk = uniqueRows.slice(start, start + 250);
        try {
            const result = await save(chunk.map(({ transformerNumber, gisDetails }) => ({ transformerNumber, gisDetails })));
            const counts = result.results;
            if (!counts || !Array.isArray(counts.errors) || ![counts.success, counts.created, counts.updated].every((n) => Number.isSafeInteger(n) && n >= 0) || counts.created + counts.updated !== counts.success || counts.success > chunk.length || (result.success && counts.success !== chunk.length))
                throw new Error("เซิร์ฟเวอร์ส่งผลการบันทึกไม่ครบถ้วน กรุณาตรวจสอบแล้วลองใหม่");
            summary.saved += counts.success;
            summary.created += counts.created;
            summary.updated += counts.updated;
            for (const error of counts.errors) {
                const physicalRow = chunk[error.row - 1]?.physicalRow;
                summary.errors.push(`${physicalRow ? `บรรทัด ${physicalRow}` : "ชุดข้อมูล"}: ${error.error}`);
            }
            if (!result.success && !counts.errors.length)
                summary.errors.push(result.error || "บางชุดข้อมูลไม่สำเร็จ");
            onCommitted(summary.saved, uniqueRows.length);
        }
        catch (error) {
            summary.errors.push(`บรรทัด ${chunk[0].physicalRow}–${chunk[chunk.length - 1].physicalRow}: ${error instanceof Error ? error.message : "ไม่สามารถยืนยันการบันทึกได้"}`);
            break;
        }
    }
    return summary;
}
