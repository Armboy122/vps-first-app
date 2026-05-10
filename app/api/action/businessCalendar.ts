"use server";

import { getServerSession } from "next-auth/next";
import { BusinessCalendarDateType, Prisma } from "@prisma/client";
import { authOptions } from "@/authOption";
import prisma from "@/lib/prisma";
import { createDateOnlyUtc, toDateOnlyKey } from "@/lib/date-utils";

const DEFAULT_SCOPE = "GLOBAL";
const MAX_BULK_IMPORT_ROWS = 10000;

type BusinessCalendarPayload = {
  date: string;
  type: "HOLIDAY" | "SPECIAL_WORKDAY";
  name: string;
  scope?: string;
  note?: string | null;
  isActive?: boolean;
};

type BusinessCalendarImportPayload = BusinessCalendarPayload & {
  rowNumber?: number;
};

export type BusinessCalendarDateMetadata = {
  dateKey: string;
  type: BusinessCalendarDateType;
  name: string;
  scope: string;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false as const, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  if (session.user.role !== "ADMIN") {
    return { success: false as const, error: "ต้องเป็นผู้ดูแลระบบเท่านั้น" };
  }

  return { success: true as const };
}

function normalizeScope(scope?: string | null) {
  const trimmedScope = scope?.trim();
  return trimmedScope || DEFAULT_SCOPE;
}

function normalizeType(type: string): BusinessCalendarDateType | null {
  if (type === BusinessCalendarDateType.HOLIDAY) {
    return BusinessCalendarDateType.HOLIDAY;
  }

  if (type === BusinessCalendarDateType.SPECIAL_WORKDAY) {
    return BusinessCalendarDateType.SPECIAL_WORKDAY;
  }

  return null;
}

function parseDateOnly(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return null;
  }

  try {
    const parsedDate = createDateOnlyUtc(date);
    return toDateOnlyKey(parsedDate) === date ? parsedDate : null;
  } catch {
    return null;
  }
}

function validatePayload(payload: BusinessCalendarPayload) {
  const errors: string[] = [];
  const date = parseDateOnly(payload.date);
  const type = normalizeType(payload.type);
  const name = payload.name?.trim() || "";
  const scope = normalizeScope(payload.scope);

  if (!date) {
    errors.push("วันที่ต้องเป็นวันที่จริงในรูปแบบ YYYY-MM-DD");
  }

  if (!type) {
    errors.push("ประเภทวันที่ไม่ถูกต้อง");
  }

  if (!name) {
    errors.push("ชื่อวันหยุด/วันทำงานพิเศษไม่สามารถเป็นค่าว่างได้");
  }

  if (name.length > 120) {
    errors.push("ชื่อยาวเกินไป (สูงสุด 120 ตัวอักษร)");
  }

  if (scope.length > 60) {
    errors.push("scope ยาวเกินไป (สูงสุด 60 ตัวอักษร)");
  }

  if ((payload.note || "").length > 500) {
    errors.push("หมายเหตุยาวเกินไป (สูงสุด 500 ตัวอักษร)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      date: date || createDateOnlyUtc("1970-01-01"),
      type: type || BusinessCalendarDateType.HOLIDAY,
      name,
      scope,
      note: payload.note?.trim() || null,
      isActive: payload.isActive ?? true,
    },
  };
}

function mapCalendarDate(entry: {
  id: number;
  date: Date;
  type: BusinessCalendarDateType;
  name: string;
  scope: string;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    dateKey: toDateOnlyKey(entry.date),
    type: entry.type,
    name: entry.name,
    scope: entry.scope,
    note: entry.note,
    isActive: entry.isActive,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function getBusinessCalendarDates(
  page = 1,
  pageSize = 10,
  search = "",
  type?: "" | BusinessCalendarDateType,
  includeInactive = false,
) {
  const admin = await requireAdmin();
  if (!admin.success) {
    return { entries: [], totalCount: 0, totalPages: 0, error: admin.error };
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const skip = (safePage - 1) * safePageSize;
  const trimmedSearch = search.trim();

  const where: Prisma.BusinessCalendarDateWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(type ? { type } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            { name: { contains: trimmedSearch, mode: "insensitive" } },
            { scope: { contains: trimmedSearch, mode: "insensitive" } },
            { note: { contains: trimmedSearch, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [entries, totalCount] = await Promise.all([
      prisma.businessCalendarDate.findMany({
        where,
        skip,
        take: safePageSize,
        orderBy: [{ date: "desc" }, { id: "desc" }],
      }),
      prisma.businessCalendarDate.count({ where }),
    ]);

    return {
      entries: entries.map(mapCalendarDate),
      totalCount,
      totalPages: Math.ceil(totalCount / safePageSize),
    };
  } catch (error) {
    console.error("Failed to fetch business calendar dates:", error);
    return { entries: [], totalCount: 0, totalPages: 0 };
  }
}

export async function getActiveBusinessCalendarDateMetadata(
  startDate: string,
  endDate: string,
  scope = DEFAULT_SCOPE,
): Promise<BusinessCalendarDateMetadata[]> {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end || start > end) {
    return [];
  }

  try {
    const entries = await prisma.businessCalendarDate.findMany({
      where: {
        scope: normalizeScope(scope),
        isActive: true,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: {
        date: true,
        type: true,
        name: true,
        scope: true,
      },
    });

    return entries.map((entry) => ({
      dateKey: toDateOnlyKey(entry.date),
      type: entry.type,
      name: entry.name,
      scope: entry.scope,
    }));
  } catch (error) {
    console.error("Failed to fetch active business calendar metadata:", error);
    return [];
  }
}

export async function createBusinessCalendarDate(
  payload: BusinessCalendarPayload,
) {
  const admin = await requireAdmin();
  if (!admin.success) return admin;

  const validation = validatePayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(", ") };
  }

  try {
    const entry = await prisma.businessCalendarDate.create({
      data: validation.data,
    });

    return { success: true, entry: mapCalendarDate(entry) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "วันที่นี้มีอยู่แล้วใน scope เดียวกัน กรุณาแก้ไขรายการเดิม",
      };
    }

    console.error("Failed to create business calendar date:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างรายการ" };
  }
}

export async function updateBusinessCalendarDate(
  id: number,
  payload: BusinessCalendarPayload,
) {
  const admin = await requireAdmin();
  if (!admin.success) return admin;

  const validation = validatePayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(", ") };
  }

  try {
    const entry = await prisma.businessCalendarDate.update({
      where: { id },
      data: validation.data,
    });

    return { success: true, entry: mapCalendarDate(entry) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "วันที่นี้มีอยู่แล้วใน scope เดียวกัน กรุณาใช้วันที่หรือ scope อื่น",
      };
    }

    console.error("Failed to update business calendar date:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขรายการ" };
  }
}

export async function deleteBusinessCalendarDate(id: number) {
  const admin = await requireAdmin();
  if (!admin.success) return admin;

  try {
    await prisma.businessCalendarDate.delete({ where: { id } });
    return { success: true, message: "ลบรายการเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("Failed to delete business calendar date:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบรายการ" };
  }
}

export async function bulkImportBusinessCalendarDates(
  payloads: BusinessCalendarImportPayload[],
) {
  const admin = await requireAdmin();
  if (!admin.success) {
    return {
      ...admin,
      results: { created: 0, updated: 0, errors: [] as string[] },
    };
  }

  if (!Array.isArray(payloads) || payloads.length === 0) {
    return {
      success: false,
      error: "ไม่มีข้อมูลที่จะนำเข้า",
      results: { created: 0, updated: 0, errors: [] as string[] },
    };
  }

  if (payloads.length > MAX_BULK_IMPORT_ROWS) {
    return {
      success: false,
      error: `จำนวนรายการเกินกำหนด (สูงสุด ${MAX_BULK_IMPORT_ROWS.toLocaleString()} รายการ)`,
      results: { created: 0, updated: 0, errors: [] as string[] },
    };
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const payload of payloads) {
    const rowLabel = payload.rowNumber ? `บรรทัด ${payload.rowNumber}` : "รายการ";
    const validation = validatePayload(payload);

    if (!validation.isValid) {
      results.errors.push(`${rowLabel}: ${validation.errors.join(", ")}`);
      continue;
    }

    try {
      const existing = await prisma.businessCalendarDate.findUnique({
        where: {
          date_scope: {
            date: validation.data.date,
            scope: validation.data.scope,
          },
        },
        select: { id: true },
      });

      await prisma.businessCalendarDate.upsert({
        where: {
          date_scope: {
            date: validation.data.date,
            scope: validation.data.scope,
          },
        },
        update: validation.data,
        create: validation.data,
      });

      if (existing) {
        results.updated += 1;
      } else {
        results.created += 1;
      }
    } catch (error) {
      console.error("Failed to import business calendar date:", error);
      results.errors.push(`${rowLabel}: ไม่สามารถบันทึกข้อมูลได้`);
    }
  }

  return {
    success: results.errors.length === 0,
    error:
      results.errors.length > 0
        ? "นำเข้าบางรายการไม่สำเร็จ กรุณาตรวจสอบรายละเอียด"
        : undefined,
    results,
  };
}
