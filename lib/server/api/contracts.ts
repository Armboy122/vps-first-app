import { z } from "zod";
import { isValidISODateKey } from "@/lib/date-utils";
export const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().max(100000).default(1),
    limit: z.coerce.number().int().positive().max(10000).default(50),
    workCenterId: z.coerce.number().int().positive().optional(),
    omsStatus: z.enum(["NOT_ADDED", "PROCESSED", "CANCELLED"]).optional(),
    statusRequest: z.enum(["CONFIRM", "CANCELLED", "NOT"]).optional(),
    startDate: z.string().refine(isValidISODateKey).optional(),
    endDate: z.string().refine(isValidISODateKey).optional(),
}).refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, "วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด");
export function assertSameOriginMutation(request: Request): void {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method))
        return;
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin || request.headers.get("x-vps-client") !== "web" || request.headers.get("sec-fetch-site") === "cross-site") {
        throw Object.assign(new Error("คำขอนี้ไม่ได้มาจากเว็บไซต์เดียวกัน"), { status: 403, code: "CROSS_ORIGIN" });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") && request.method !== "DELETE") {
        throw Object.assign(new Error("รองรับเฉพาะข้อมูล JSON"), { status: 415, code: "UNSUPPORTED_MEDIA_TYPE" });
    }
}
