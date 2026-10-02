import { getCurrentActor, AccessError } from "@/lib/server/auth/currentActor";
import { canReadWorkCenter, canMutateOutage, type Actor, type OutageMutation } from "@/lib/modules/outages/domain/authorization";
import { PowerOutageRequestSchema, PowerOutageRequestInput, PowerOutageRequestUpdateSchema, } from "@/lib/validations/powerOutageRequest";
import { OMSStatus, Request } from "@prisma/client";
import { createThailandDateTime, isValidISODateKey } from "@/lib/date-utils";
import { clearOMSCache } from "@/lib/cache-utils";
import { z } from "zod";
import { PowerOutageRequestService, BusinessCalendarValidationError, } from "@/lib/services";
import prisma from "@/lib/prisma";
import { ImportBatchError } from "@/lib/services/idempotentBatch";
import { canCreateOutageInScope } from "@/lib/services/powerOutageAuthorization";
// ─────────────────────────────────────────────
// Shared result type for consistent server action returns
// ─────────────────────────────────────────────
type ActionResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
    details?: unknown;
};
interface ValidationError {
    index: number;
    error: string;
    data: PowerOutageRequestInput;
}
async function getCurrentUser(actorOverride?: Actor) {
    return actorOverride || getCurrentActor();
}
function publicFailure(error: unknown, fallback: string) {
    if (error instanceof AccessError)
        return { success: false as const, error: error.message, code: error.code };
    return { success: false as const, error: fallback, code: "INTERNAL_ERROR" };
}
async function requireOutageMutation(actor: Actor, id: number, mutation: OutageMutation) {
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new AccessError("NOT_FOUND", "ไม่พบคำขอดับไฟ");
    const existing = await PowerOutageRequestService.getRequestById(id);
    if (!existing || !canReadWorkCenter(actor, existing.workCenterId))
        throw new AccessError("NOT_FOUND", "ไม่พบคำขอดับไฟ");
    if (!canMutateOutage(actor, existing, mutation))
        throw new AccessError("FORBIDDEN", "ไม่มีสิทธิ์ดำเนินการกับคำขอนี้");
    return existing;
}
async function canCreateInRequestedScope(user: Awaited<ReturnType<typeof getCurrentUser>>, workCenterId: number, branchId: number): Promise<boolean> {
    if (!canCreateOutageInScope({
        role: user.role,
        userWorkCenterId: user.workCenterId,
        userBranchId: user.branchId,
        workCenterId,
        branchId,
    }))
        return false;
    // The Branch relation is independent of WorkCenter in this schema, so verify
    // the pair explicitly before passing it to persistence.
    return Boolean(await prisma.branch.findFirst({
        where: { id: branchId, workCenterId },
        select: { id: true },
    }));
}
const OUTAGE_BATCH_MAX_ROWS = 500;
const OUTAGE_BATCH_MAX_BYTES = 2500000;
/** Server-authoritative calendar validation used by the CSV preview. */
export async function validateOutageDatesForImport(dates: string[], actorOverride?: Actor) {
    await getCurrentUser(actorOverride);
    if (!Array.isArray(dates) || dates.length > OUTAGE_BATCH_MAX_ROWS) {
        return { success: false as const, error: "ตรวจสอบวันที่ได้สูงสุด 500 รายการต่อครั้ง" };
    }
    const results: Record<string, {
        isValid: boolean;
        error?: string;
    }> = {};
    for (const date of Array.from(new Set(dates))) {
        if (typeof date !== "string" || !isValidISODateKey(date)) {
            results[date] = { isValid: false, error: "รูปแบบวันที่ไม่ถูกต้อง" };
            continue;
        }
        const parsed = new Date(`${date}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
            results[date] = { isValid: false, error: "วันที่ไม่ถูกต้อง" };
            continue;
        }
        results[date] = await PowerOutageRequestService.validateOutageDateWithCalendar(parsed);
    }
    return { success: true as const, results };
}
//สร้างคำขอดับไฟ
export async function createPowerOutageRequest(data: PowerOutageRequestInput, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        const validatedData = PowerOutageRequestSchema.parse(data);
        const workCenterId = Number(validatedData.workCenterId);
        const branchId = Number(validatedData.branchId);
        if (!(await canCreateInRequestedScope(currentUser, workCenterId, branchId))) {
            return { success: false as const, error: "ไม่มีสิทธิ์สร้างคำขอในจุดรวมงานหรือสาขานี้", code: "FORBIDDEN" };
        }
        // แปลงเวลาเป็น timezone ของไทย
        const outageDate = new Date(validatedData.outageDate);
        const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
        const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);
        const transformer = await prisma.transformer.findUnique({ where: { transformerNumber: validatedData.transformerNumber } });
        if (!transformer)
            return { success: false, error: `ไม่พบหม้อแปลงหมายเลข "${validatedData.transformerNumber}" ในระบบ` };
        // สร้างคำขอดับไฟ
        const result = await PowerOutageRequestService.createRequest({
            outageDate,
            startTime,
            endTime,
            workCenterId,
            branchId,
            transformerNumber: validatedData.transformerNumber,
            gisDetails: validatedData.gisDetails,
            area: validatedData.area,
            createdById: currentUser.id,
        });
        // ล้างแคช OMS หลังจากสร้างคำขอดับไฟ
        clearOMSCache();
        return { success: true, data: result };
    }
    catch (error) {
        if (error instanceof AccessError)
            return publicFailure(error, "เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ");
        if (error instanceof BusinessCalendarValidationError)
            return { success: false, error: error.message };
        if (error instanceof z.ZodError) {
            // Expected validation failure — no console.error needed
            const errorMessages = error.errors.map((err) => err.message).join(", ");
            return { success: false, error: `ข้อมูลไม่ถูกต้อง: ${errorMessages}` };
        }
        if (error && typeof error === "object" && "code" in error) {
            if ((error as {
                code: string;
            }).code === "P2002") {
                // Expected constraint violation — no console.error needed
                return { success: false, error: "ข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ" };
            }
        }
        // Truly unexpected error
        console.error("Failed to create power outage request:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ" };
    }
}
// ดรอปดาวน์หม้อแปลง
export async function searchTransformers(searchTerm: string, actorOverride?: Actor) {
    await getCurrentUser(actorOverride);
    if (typeof searchTerm !== "string" || searchTerm.length > 100)
        throw new Error("รูปแบบคำค้นไม่ถูกต้อง");
    try {
        const results = await prisma.transformer.findMany({
            where: {
                OR: [
                    { transformerNumber: { contains: searchTerm, mode: "insensitive" } },
                    { gisDetails: { contains: searchTerm, mode: "insensitive" } },
                ],
            },
            take: 10,
        });
        return results;
    }
    catch (error) {
        // Unexpected DB error — log and rethrow
        console.error("Error searching transformers:", error);
        throw error;
    }
}
export async function getTransformerByNumber(transformerNumber: string, actorOverride?: Actor) {
    await getCurrentUser(actorOverride);
    const normalized = transformerNumber.trim();
    if (!normalized || normalized.length > 100)
        return null;
    return prisma.transformer.findUnique({ where: { transformerNumber: normalized } });
}
/** Exact bulk lookup for preview; never use fuzzy search results as identity. */
export async function getTransformersByNumbers(numbers: string[], actorOverride?: Actor) {
    await getCurrentUser(actorOverride);
    if (!Array.isArray(numbers) || numbers.length > OUTAGE_BATCH_MAX_ROWS || numbers.some((number) => typeof number !== "string" || !number.trim() || number.trim().length > 100)) {
        throw new Error("ตรวจสอบหม้อแปลงได้สูงสุด 500 หมายเลขที่ถูกต้องต่อครั้ง");
    }
    return prisma.transformer.findMany({
        where: { transformerNumber: { in: Array.from(new Set(numbers.map((number) => number.trim()))) } },
        select: { transformerNumber: true, gisDetails: true },
    });
}
export async function getPowerOutageRequests(page: number = 1, limit: number = 50, filters?: {
    workCenterId?: number;
    omsStatus?: OMSStatus;
    statusRequest?: Request;
    startDate?: Date;
    endDate?: Date;
}, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        if (filters?.workCenterId && !canReadWorkCenter(currentUser, filters.workCenterId))
            throw new AccessError("FORBIDDEN", "ไม่มีสิทธิ์อ่านจุดรวมงานนี้");
        const scopedFilters = { ...filters, ...(currentUser.role === "ADMIN" || currentUser.role === "VIEWER" ? {} : { workCenterId: currentUser.workCenterId }) };
        // Ensure page and limit are numbers and have valid values
        const validPage = Math.max(1, Number(page) || 1);
        const validLimit = Math.max(1, Math.min(10000, Number(limit) || 50));
        // ใช้ service layer สำหรับ pagination
        const result = await PowerOutageRequestService.getPaginatedRequests({ page: validPage, limit: validLimit }, scopedFilters);
        // ใช้ business logic สำหรับ sorting ที่ซับซ้อน
        const sortedData = PowerOutageRequestService.sortRequests(result.data);
        return {
            data: sortedData,
            pagination: result.pagination,
        };
    }
    catch (error) {
        console.error("Failed to fetch power outage requests:", error);
        if (error instanceof AccessError)
            throw error;
        throw new Error("Failed to fetch power outage requests");
    }
}
export async function deletePowerOutageRequest(id: number, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        await requireOutageMutation(currentUser, id, "delete");
        await PowerOutageRequestService.deleteRequest(id);
        // ล้างแคช OMS หลังจากลบคำขอดับไฟ
        clearOMSCache();
        return { success: true, message: "คำขอถูกลบเรียบร้อยแล้ว" };
    }
    catch (error) {
        console.error("Error deleting power outage request:", error);
        const failure = publicFailure(error, "เกิดข้อผิดพลาดในการลบคำขอ");
        return { ...failure, message: failure.error };
    }
}
export async function updatePowerOutageRequest(id: number, data: PowerOutageRequestInput, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        const existingRequest = await requireOutageMutation(currentUser, id, "edit");
        if (!existingRequest) {
            return { success: false, error: "ไม่พบคำขอดับไฟ" };
        }
        const validatedData = PowerOutageRequestUpdateSchema.parse(data);
        const outageDate = new Date(validatedData.outageDate);
        const existingDateKey = existingRequest.outageDate.toISOString().split("T")[0];
        const isChangingOutageDate = validatedData.outageDate !== existingDateKey;
        if (isChangingOutageDate && currentUser.role !== "ADMIN") {
            return {
                success: false,
                error: "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขวันที่ดับไฟได้",
            };
        }
        // ADMIN can override outage date lead-time/calendar rules during updates.
        // Creation requests still use validateOutageDateWithCalendar above.
        // แปลงเวลาเป็น timezone ของไทย โดยใช้ date-utils
        const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
        const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error("Invalid time format");
        }
        const updatedRequest = await PowerOutageRequestService.updateRequest(id, {
            outageDate,
            startTime,
            endTime,
            area: validatedData.area,
        });
        // ล้างแคช OMS หลังจากอัปเดตคำขอดับไฟ
        clearOMSCache();
        return {
            success: true,
            data: updatedRequest,
        };
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return { success: false as const, error: error.errors.map((item) => item.message).join(", "), code: "VALIDATION_ERROR" };
        return publicFailure(error, "เกิดข้อผิดพลาดในการแก้ไขคำขอดับไฟ");
    }
}
export async function updateOMS(id: number, omsStatus: OMSStatus, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        await requireOutageMutation(currentUser, id, "oms");
        if (!["NOT_ADDED", "PROCESSED", "CANCELLED"].includes(omsStatus))
            return { success: false as const, error: "สถานะ OMS ไม่ถูกต้อง", code: "VALIDATION_ERROR" };
        const updatedRequest = await PowerOutageRequestService.updateOMSStatus(id, omsStatus, currentUser.id);
        // ล้างแคช OMS หลังจากอัปเดตสถานะ OMS
        clearOMSCache();
        return {
            success: true,
            data: updatedRequest,
        };
    }
    catch (error) {
        return publicFailure(error, "เกิดข้อผิดพลาดในการแก้ไขสถานะ OMS");
    }
}
export async function updateStatusRequest(id: number, statusRequest: Request, actorOverride?: Actor) {
    try {
        const currentUser = await getCurrentUser(actorOverride);
        await requireOutageMutation(currentUser, id, "request-status");
        if (!["CONFIRM", "CANCELLED", "NOT"].includes(statusRequest))
            return { success: false as const, error: "สถานะคำขอไม่ถูกต้อง", code: "VALIDATION_ERROR" };
        const updatedRequest = await PowerOutageRequestService.updateRequestStatus(id, statusRequest, currentUser.id);
        // ล้างแคช OMS หลังจากอัปเดตสถานะคำขอ
        clearOMSCache();
        return {
            success: true,
            data: updatedRequest,
        };
    }
    catch (error) {
        return publicFailure(error, "เกิดข้อผิดพลาดในการแก้ไขสถานะคำขอ");
    }
}
class OutageImportValidationError extends ImportBatchError {
    constructor(public validationErrors: ValidationError[]) { super("พบข้อผิดพลาดในการตรวจสอบข้อมูล"); }
}
// Authorize the entire batch first; exact retries precede mutable creation checks.
export async function createMultiplePowerOutageRequests(dataList: PowerOutageRequestInput[], idempotencyKey: string, actorOverride?: Actor) {
    const totalCount = Array.isArray(dataList) ? dataList.length : 0;
    const fail = (error: string, validationErrors?: ValidationError[], code = "VALIDATION_ERROR") => ({ success: false as const, error, code, successCount: 0, totalCount, ...(validationErrors ? { validationErrors } : {}) });
    try {
        const currentUser = await getCurrentUser(actorOverride);
        if (!totalCount)
            return fail("กรุณาระบุรายการคำขออย่างน้อย 1 รายการ");
        if (totalCount > OUTAGE_BATCH_MAX_ROWS)
            return fail(`นำเข้าได้สูงสุด ${OUTAGE_BATCH_MAX_ROWS} รายการต่อครั้ง`);
        if (new TextEncoder().encode(JSON.stringify(dataList)).byteLength > OUTAGE_BATCH_MAX_BYTES)
            return fail("ขนาดข้อมูลเกิน 2.5 MB ต่อครั้ง กรุณาแบ่งรายการหรือย่อรายละเอียด");
        if (typeof idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey))
            return fail("รหัสการส่งข้อมูลไม่ถูกต้อง");
        const errors: ValidationError[] = [];
        const normalized = dataList.flatMap((raw, i) => {
            const parsed = PowerOutageRequestSchema.safeParse(raw);
            if (!parsed.success) {
                errors.push({ index: i + 1, error: parsed.error.errors.map((error) => error.message).join(", "), data: raw });
                return [];
            }
            const row = parsed.data;
            const workCenterId = Number(row.workCenterId), branchId = Number(row.branchId);
            if (!canCreateOutageInScope({ role: currentUser.role, userWorkCenterId: currentUser.workCenterId, userBranchId: currentUser.branchId, workCenterId, branchId })) {
                errors.push({ index: i + 1, error: "ไม่มีสิทธิ์สร้างคำขอในจุดรวมงานหรือสาขานี้", data: raw });
            }
            return [{
                    outageDate: new Date(row.outageDate), startTime: createThailandDateTime(row.outageDate, row.startTime), endTime: createThailandDateTime(row.outageDate, row.endTime),
                    workCenterId, branchId, transformerNumber: row.transformerNumber.trim(), gisDetails: row.gisDetails.trim(), area: row.area?.trim() || null, createdById: currentUser.id,
                }];
        });
        if (errors.length)
            return fail("พบข้อผิดพลาดในการตรวจสอบข้อมูล", errors);
        const pairs = Array.from(new Map(normalized.map((row) => [`${row.branchId}:${row.workCenterId}`, { id: row.branchId, workCenterId: row.workCenterId }])).values());
        const branches = await prisma.branch.findMany({ where: { OR: pairs }, select: { id: true, workCenterId: true } });
        const validPairs = new Set(branches.map((branch) => `${branch.id}:${branch.workCenterId}`));
        normalized.forEach((row, i) => {
            if (!validPairs.has(`${row.branchId}:${row.workCenterId}`))
                errors.push({ index: i + 1, error: "สาขาไม่อยู่ในจุดรวมงานที่ระบุ", data: dataList[i] });
        });
        if (errors.length)
            return fail("พบข้อผิดพลาดในการตรวจสอบข้อมูล", errors);
        const results = await PowerOutageRequestService.createMultipleRequests(normalized, idempotencyKey.toLowerCase(), async () => {
            const dates = Array.from(new Set(normalized.map((row) => row.outageDate.toISOString().slice(0, 10))));
            const dateResults = new Map(await Promise.all(dates.map(async (date) => [date, await PowerOutageRequestService.validateOutageDateWithCalendar(new Date(date))] as const)));
            const transformers = await prisma.transformer.findMany({ where: { transformerNumber: { in: Array.from(new Set(normalized.map((row) => row.transformerNumber))) } }, select: { transformerNumber: true } });
            const existingNumbers = new Set(transformers.map((row) => row.transformerNumber));
            normalized.forEach((row, i) => {
                const calendar = dateResults.get(row.outageDate.toISOString().slice(0, 10))!;
                if (!calendar.isValid)
                    errors.push({ index: i + 1, error: calendar.error || "วันที่ดับไฟไม่ถูกต้อง", data: dataList[i] });
                if (!existingNumbers.has(row.transformerNumber))
                    errors.push({ index: i + 1, error: `ไม่พบหม้อแปลงหมายเลข "${row.transformerNumber}" ในระบบ`, data: dataList[i] });
            });
            if (errors.length)
                throw new OutageImportValidationError(errors);
        });
        clearOMSCache();
        return { success: true as const, data: results, successCount: results.length, totalCount, message: `บันทึกคำขอดับไฟสำเร็จทั้งหมด ${results.length} รายการ` };
    }
    catch (error) {
        if (error instanceof AccessError)
            return { ...fail(error.message), code: error.code };
        if (error instanceof OutageImportValidationError)
            return fail(error.message, error.validationErrors);
        if (error instanceof ImportBatchError)
            return fail(error.message, undefined, error.message.includes("different outage-request batch") ? "IDEMPOTENCY_CONFLICT" : "INTEGRITY_ERROR");
        console.error("Failed to create multiple power outage requests:", error);
        return fail("เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ", undefined, "INTERNAL_ERROR");
    }
}
