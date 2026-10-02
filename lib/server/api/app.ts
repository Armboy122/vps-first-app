import { Elysia, t } from "elysia";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentActor, AccessError } from "@/lib/server/auth/currentActor";
import type { Actor } from "@/lib/modules/outages/domain/authorization";
import { canReadWorkCenter } from "@/lib/modules/outages/domain/authorization";
import * as outages from "@/lib/modules/outages/application/useCases";
import { BusinessCalendarService } from "@/lib/services/businessCalendar.service";
import { assertSameOriginMutation, listQuerySchema } from "./contracts";
const outageBody = t.Object({
    outageDate: t.String(), startTime: t.String(), endTime: t.String(),
    workCenterId: t.String(), branchId: t.String(), transformerNumber: t.String(), gisDetails: t.String(), area: t.Union([t.String(), t.Null()]),
});
const updateBody = t.Object({ outageDate: t.String(), startTime: t.String(), endTime: t.String(), area: t.Union([t.String(), t.Null()]) });
const idParams = t.Object({ id: t.Numeric({ minimum: 1, multipleOf: 1 }) });
export interface ApiPorts {
    getActor: () => Promise<Actor>;
    outages: typeof outages;
    workCenters: (actor: Actor) => Promise<Array<{
        id: number;
        name: string;
    }>>;
    branches: (actor: Actor, workCenterId: number) => Promise<Array<{
        id: number;
        shortName: string;
        workCenterId: number;
    }>>;
    calendar: (startDate: string, endDate: string) => ReturnType<typeof BusinessCalendarService.getActiveEntries>;
}
const runtimePorts: ApiPorts = {
    getActor: getCurrentActor,
    outages,
    workCenters: (actor) => prisma.workCenter.findMany({ where: actor.role === "ADMIN" || actor.role === "VIEWER" ? {} : { id: actor.workCenterId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    branches: (actor, workCenterId) => {
        if (!canReadWorkCenter(actor, workCenterId))
            throw new AccessError("FORBIDDEN", "ไม่มีสิทธิ์อ่านจุดรวมงานนี้");
        return prisma.branch.findMany({ where: { workCenterId }, select: { id: true, shortName: true, workCenterId: true } });
    },
    calendar: (startDate, endDate) => BusinessCalendarService.getActiveEntries(startDate, endDate),
};
function resultStatus(result: {
    success?: boolean;
    error?: string;
    code?: string;
}) {
    if (result.success !== false)
        return 200;
    if (result.code === "UNAUTHENTICATED")
        return 401;
    if (result.code === "FORBIDDEN")
        return 403;
    if (result.code === "NOT_FOUND")
        return 404;
    if (result.code === "INTERNAL_ERROR" || result.code === "INTEGRITY_ERROR")
        return 500;
    if (result.code === "IDEMPOTENCY_CONFLICT" || result.error?.includes("different outage-request batch"))
        return 409;
    return 422;
}
/** One authenticated transport; business logic is shared with guarded legacy Actions. */
export function createApi(ports: ApiPorts = runtimePorts) {
    return new Elysia({ prefix: "/api/v1", aot: false })
        .onRequest(({ request, set }) => {
        set.headers["cache-control"] = "no-store, private";
        set.headers["x-content-type-options"] = "nosniff";
        assertSameOriginMutation(request);
    })
        .derive(async () => ({ actor: await ports.getActor() }))
        .onError(({ error, code, set }) => {
        if (error instanceof AccessError) {
            set.status = error.status;
            return { success: false as const, error: error.message, code: error.code };
        }
        if ("status" in error && "code" in error && error.code === "CROSS_ORIGIN") {
            set.status = 403;
            return { success: false as const, error: "คำขอนี้ไม่ได้มาจากเว็บไซต์เดียวกัน", code: "CROSS_ORIGIN" };
        }
        if ("status" in error && error.status === 415) {
            set.status = 415;
            return { success: false as const, error: "รองรับเฉพาะข้อมูล JSON", code: "UNSUPPORTED_MEDIA_TYPE" };
        }
        if (error instanceof z.ZodError || code === "VALIDATION" || code === "PARSE") {
            set.status = 422;
            return { success: false as const, error: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรูปแบบและขอบเขตข้อมูล", code: "VALIDATION_ERROR" };
        }
        if (code === "NOT_FOUND") {
            set.status = 404;
            return { success: false as const, error: "ไม่พบรายการ", code: "NOT_FOUND" };
        }
        set.status = 500;
        return { success: false as const, error: "เกิดข้อผิดพลาดภายในระบบ", code: "INTERNAL_ERROR" };
    })
        .get("/me", ({ actor }) => ({ success: true as const, data: actor }))
        .get("/work-centers", async ({ actor }) => ({ success: true as const, data: await ports.workCenters(actor) }))
        .get("/branches", async ({ actor, query }) => ({ success: true as const, data: await ports.branches(actor, query.workCenterId) }), { query: t.Object({ workCenterId: t.Numeric({ minimum: 1, multipleOf: 1 }) }) })
        .get("/transformers", async ({ actor, query }) => ({ success: true as const, data: await ports.outages.searchTransformers(query.search || "", actor) }), { query: t.Object({ search: t.Optional(t.String({ maxLength: 100 })) }) })
        .post("/transformers/lookup", async ({ actor, body }) => ({ success: true as const, data: await ports.outages.getTransformersByNumbers(body.numbers, actor) }), { body: t.Object({ numbers: t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 500 }) }) })
        .get("/calendar", async ({ query }) => {
        const parsed = listQuerySchema.parse(query);
        if (!parsed.startDate || !parsed.endDate)
            throw new z.ZodError([]);
        return { success: true as const, data: await ports.calendar(parsed.startDate, parsed.endDate) };
    }, { query: t.Object({ startDate: t.String(), endDate: t.String() }) })
        .get("/outages", async ({ actor, query }) => {
        const parsed = listQuerySchema.parse(query);
        const data = await ports.outages.getPowerOutageRequests(parsed.page, parsed.limit, { workCenterId: parsed.workCenterId, omsStatus: parsed.omsStatus, statusRequest: parsed.statusRequest, startDate: parsed.startDate ? new Date(parsed.startDate) : undefined, endDate: parsed.endDate ? new Date(parsed.endDate) : undefined }, actor);
        return { success: true as const, ...data };
    })
        .post("/outages/import/preview-dates", async ({ actor, body, set }) => {
        const result = await ports.outages.validateOutageDatesForImport(body.dates, actor);
        set.status = resultStatus(result);
        return result;
    }, { body: t.Object({ dates: t.Array(t.String(), { maxItems: 500 }) }) })
        .post("/outages/import", async ({ actor, body, set }) => {
        const result = await ports.outages.createMultiplePowerOutageRequests(body.requests, body.idempotencyKey, actor);
        set.status = resultStatus(result);
        return result;
    }, { body: t.Object({ requests: t.Array(outageBody, { minItems: 1, maxItems: 500 }), idempotencyKey: t.String({ format: "uuid" }) }) })
        .post("/outages", async ({ actor, body, set }) => {
        const result = await ports.outages.createPowerOutageRequest(body, actor);
        set.status = resultStatus(result);
        return result;
    }, { body: outageBody })
        .patch("/outages/:id", async ({ actor, body, params, set }) => {
        const result = await ports.outages.updatePowerOutageRequest(params.id, body as Parameters<typeof outages.updatePowerOutageRequest>[1], actor);
        set.status = resultStatus(result);
        return result;
    }, { body: updateBody, params: idParams })
        .patch("/outages/:id/oms", async ({ actor, body, params, set }) => {
        const result = await ports.outages.updateOMS(params.id, body.omsStatus, actor);
        set.status = resultStatus(result);
        return result;
    }, { body: t.Object({ omsStatus: t.Union([t.Literal("NOT_ADDED"), t.Literal("PROCESSED"), t.Literal("CANCELLED")]) }), params: idParams })
        .patch("/outages/:id/status", async ({ actor, body, params, set }) => {
        const result = await ports.outages.updateStatusRequest(params.id, body.statusRequest, actor);
        set.status = resultStatus(result);
        return result;
    }, { body: t.Object({ statusRequest: t.Union([t.Literal("CONFIRM"), t.Literal("CANCELLED"), t.Literal("NOT")]) }), params: idParams })
        .delete("/outages/:id", async ({ actor, params, set }) => {
        const result = await ports.outages.deletePowerOutageRequest(params.id, actor);
        set.status = resultStatus(result);
        return result;
    }, { params: idParams });
}
export const app = createApi();
export type App = typeof app;
