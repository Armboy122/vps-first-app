"use server";

import { getCurrentActor, requireAdmin } from "@/lib/server/auth/currentActor";
import { assertTransformerUpsertCounts } from "@/lib/services/transformerImportCounts";
import { hash, compare } from "bcryptjs";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";

import { CreateUserInput, CreateUserSchema } from "@/lib/validations/user";
import { Role, Prisma } from "@prisma/client";
import { authOptions } from "@/authOption";

export async function createUser(input: CreateUserInput) {
  try {
    await requireAdmin();
    // Validate input
    const validatedData = await CreateUserSchema.parseAsync(input);
    if (!(await prisma.branch.findFirst({ where: { id: validatedData.branchId, workCenterId: validatedData.workCenterId }, select: { id: true } }))) return { success: false, error: "สาขาไม่อยู่ในจุดรวมงานที่ระบุ" };

    // ตรวจสอบว่า employeeId นี้มีอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { employeeId: validatedData.employeeId },
    });
    if (existingUser) {
      return { success: false, error: "This Employee ID is already in use" };
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        password: hashedPassword,
        fullName: validatedData.fullName,
        employeeId: validatedData.employeeId,
        workCenter: { connect: { id: validatedData.workCenterId } },
        branch: { connect: { id: validatedData.branchId } },
        role: validatedData.role,
      },
    });

    return { success: true, user: { ...user, password: undefined } };
  } catch (error) {
    console.error("Failed to create user:", error);
    return {
      success: false,
      error: "Failed to create user. Please try again.",
    };
  }
}

export async function getUsers(
  page = 1,
  pageSize = 10,
  search = "",
  workCenterId?: string,
) {
  const skip = (page - 1) * pageSize;
  
  try {
    await requireAdmin();
    // สร้าง where condition
    const whereCondition: Prisma.UserWhereInput = {};
    
    // เพิ่มเงื่อนไขการค้นหา
    if (search) {
      whereCondition.OR = [
        { employeeId: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // เพิ่มเงื่อนไขการกรองตาม workCenter
    if (workCenterId && workCenterId !== "") {
      whereCondition.workCenterId = parseInt(workCenterId);
    }

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          role: true,
          workCenter: {
            select: {
              name: true,
            },
          },
          branch: {
            select: {
              fullName: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.user.count({
        where: whereCondition,
      }),
    ]);

    return { 
      users, 
      totalUsers, 
      totalPages: Math.ceil(totalUsers / pageSize) 
    };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { users: [], totalUsers: 0, totalPages: 0 };
  }
}

export async function updateUserRole(userId: number, newRole: Role) {
  try {
    await requireAdmin();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, fullName: true, role: true },
    });
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function updateUserName(userId: number, newName: string) {
  try {
    await requireAdmin();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { fullName: newName },
      select: { id: true, fullName: true },
    });
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user name:", error);
    return { success: false, error: "Failed to update user name" };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  try {
    await getCurrentActor();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const hashedNewPassword = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

export async function updateUserProfile(data: {
  fullName?: string;
  employeeId?: string;
  workCenterId?: number;
  branchId?: number;
}) {
  try {
    const actor = await getCurrentActor();
    if (actor.role !== "ADMIN" && ((data.workCenterId !== undefined && data.workCenterId !== actor.workCenterId) || (data.branchId !== undefined && data.branchId !== actor.branchId))) return { success: false, error: "ไม่สามารถเปลี่ยนจุดรวมงานหรือสาขาของตนเองได้" };
    if (data.workCenterId !== undefined || data.branchId !== undefined) {
      const pair = await prisma.branch.findFirst({ where: { id: data.branchId ?? actor.branchId, workCenterId: data.workCenterId ?? actor.workCenterId }, select: { id: true } });
      if (!pair) return { success: false, error: "สาขาไม่อยู่ในจุดรวมงานที่ระบุ" };
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    // ตรวจสอบว่า employeeId ใหม่ไม่ซ้ำกับผู้ใช้อื่น (ถ้ามีการเปลี่ยน)
    if (data.employeeId && data.employeeId !== session.user.employeeId) {
      const existingUser = await prisma.user.findFirst({
        where: {
          employeeId: data.employeeId,
          id: { not: userId },
        },
      });
      if (existingUser) {
        return { success: false, error: "This Employee ID is already in use" };
      }
    }

    // อัปเดตข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        employeeId: data.employeeId,
        workCenterId: data.workCenterId,
        branchId: data.branchId,
      },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        workCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            fullName: true,
            shortName: true,
          },
        },
        role: true,
      },
    });

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "Failed to update user profile" };
  }
}

export async function getCurrentUser() {
  try {
    await getCurrentActor();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        role: true,
        workCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            fullName: true,
            shortName: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Failed to get current user:", error);
    return { success: false, error: "Failed to get current user" };
  }
}

export async function deleteUser(userId: number) {
  try {
    await requireAdmin();
    // ตรวจสอบสิทธิ์ของผู้ใช้ที่กำลังดำเนินการลบ (ควรทำในส่วนนี้)

    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

// ========== Transformer Management Functions ========== //

export async function getTransformers(page = 1, pageSize = 10, search = "") {
  const skip = (page - 1) * pageSize;
  try {
    await getCurrentActor();
    const [transformers, totalCount] = await Promise.all([
      prisma.transformer.findMany({
        where: {
          OR: [
            { transformerNumber: { contains: search, mode: "insensitive" } },
            { gisDetails: { contains: search, mode: "insensitive" } },
          ],
        },
        skip,
        take: pageSize,
        orderBy: { transformerNumber: "asc" },
      }),
      prisma.transformer.count({
        where: {
          OR: [
            { transformerNumber: { contains: search, mode: "insensitive" } },
            { gisDetails: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return {
      transformers,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error("Failed to fetch transformers:", error);
    return { transformers: [], totalCount: 0, totalPages: 0 };
  }
}

export async function createTransformer(data: {
  transformerNumber: string;
  gisDetails: string;
}) {
  try {
    await requireAdmin();
    // ตรวจสอบว่า transformerNumber นี้มีอยู่แล้วหรือไม่
    const existingTransformer = await prisma.transformer.findUnique({
      where: { transformerNumber: data.transformerNumber.trim() },
    });
    if (existingTransformer) {
      return { success: false, error: "หมายเลขหม้อแปลงนี้มีอยู่แล้วในระบบ" };
    }

    const transformer = await prisma.transformer.create({
      data: {
        transformerNumber: data.transformerNumber.trim(),
        gisDetails: data.gisDetails.trim(),
      },
    });

    return { success: true, transformer };
  } catch (error) {
    console.error("Failed to create transformer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างข้อมูลหม้อแปลง" };
  }
}

export async function updateTransformer(
  id: number,
  data: { transformerNumber: string; gisDetails: string },
) {
  try {
    await requireAdmin();
    // ตรวจสอบว่า transformerNumber ใหม่ไม่ซ้ำกับของอื่น
    const existingTransformer = await prisma.transformer.findFirst({
      where: {
        transformerNumber: data.transformerNumber.trim(),
        id: { not: id },
      },
    });
    if (existingTransformer) {
      return { success: false, error: "หมายเลขหม้อแปลงนี้มีอยู่แล้วในระบบ" };
    }

    const transformer = await prisma.transformer.update({
      where: { id },
      data: {
        transformerNumber: data.transformerNumber.trim(),
        gisDetails: data.gisDetails.trim(),
      },
    });

    return { success: true, transformer };
  } catch (error) {
    console.error("Failed to update transformer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัพเดทข้อมูลหม้อแปลง" };
  }
}

export async function deleteTransformer(id: number) {
  try {
    await requireAdmin();
    // ตรวจสอบว่ามีการใช้งานในคำขอดับไฟหรือไม่
    const relatedRequests = await prisma.powerOutageRequest.findMany({
      where: { transformer: { id } },
      take: 1,
    });

    if (relatedRequests.length > 0) {
      return {
        success: false,
        error: "ไม่สามารถลบได้เนื่องจากมีการใช้งานในคำขอดับไฟอยู่",
      };
    }

    await prisma.transformer.delete({
      where: { id },
    });

    return { success: true, message: "ลบข้อมูลหม้อแปลงเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("Failed to delete transformer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูลหม้อแปลง" };
  }
}

export async function bulkUpsertTransformers(
  data: Array<{ transformerNumber: string; gisDetails: string }>,
  onProgress?: (progress: {
    currentBatch: number;
    totalBatches: number;
    processedRecords: number;
    totalRecords: number;
    currentOperation: string;
  }) => void,
) {
  try {
    await requireAdmin();

    // ตรวจสอบจำนวนข้อมูลที่ส่งมา - เพิ่มขีดจำกัดสำหรับข้อมูลจำนวนมาก
    if (!data || !Array.isArray(data)) {
      return {
        success: false,
        error: "ข้อมูลไม่ถูกต้อง",
        results: { success: 0, updated: 0, created: 0, errors: [] },
      };
    }

    if (data.length === 0) {
      return {
        success: false,
        error: "ไม่มีข้อมูลที่จะประมวลผล",
        results: { success: 0, updated: 0, created: 0, errors: [] },
      };
    }

    // Keep each action request comfortably below serverless payload ceilings.
    if (data.length > 1000) {
      return {
        success: false,
        error:
          "จำนวนข้อมูลต่อคำขอเกินกำหนด (สูงสุด 1,000 รายการ) กรุณาแบ่งส่งเป็นชุดย่อย",
        results: { success: 0, updated: 0, created: 0, errors: [] },
      };
    }

    const results = {
      success: 0,
      updated: 0,
      created: 0,
      errors: [] as Array<{
        row: number;
        transformerNumber: string;
        error: string;
      }>,
      duplicatesRemoved: 0,
      duplicatesList: [] as Array<{
        transformerNumber: string;
        rows: number[];
      }>,
    };

    // Progress callback helper
    const reportProgress = (
      currentBatch: number,
      totalBatches: number,
      processedRecords: number,
      totalRecords: number,
      operation: string,
    ) => {
      if (onProgress) {
        try { onProgress({
          currentBatch,
          totalBatches,
          processedRecords,
          totalRecords,
          currentOperation: operation,
        }); } catch { /* A progress observer cannot undo a committed batch. */ }
      }
    };

    // ตรวจสอบและ sanitize ข้อมูลก่อนประมวลผล
    if (process.env.NODE_ENV !== "production") {
      console.log(`Starting validation for ${data.length} records...`);
    }
    reportProgress(0, 1, 0, data.length, "กำลังตรวจสอบความถูกต้องของข้อมูล...");

    const sanitizedData = data
      .map((item, index) => {
        const row = index + 1;

        // ตรวจสอบประเภทข้อมูล
        if (typeof item !== "object" || item === null) {
          results.errors.push({
            row,
            transformerNumber: "",
            error: "รูปแบบข้อมูลไม่ถูกต้อง",
          });
          return null;
        }

        const transformerNumber = String(item.transformerNumber || "").trim();
        const gisDetails = String(item.gisDetails || "").trim();

        // ตรวจสอบข้อมูลว่าง
        if (!transformerNumber || !gisDetails) {
          results.errors.push({
            row,
            transformerNumber: transformerNumber || "",
            error:
              "ข้อมูลไม่ครบถ้วน (ต้องมีทั้งหมายเลขหม้อแปลงและรายละเอียด GIS)",
          });
          return null;
        }

        // ตรวจสอบความยาวข้อมูล
        if (transformerNumber.length > 100) {
          results.errors.push({
            row,
            transformerNumber,
            error: "หมายเลขหม้อแปลงยาวเกินกำหนด (สูงสุด 100 ตัวอักษร)",
          });
          return null;
        }

        if (gisDetails.length > 500) {
          results.errors.push({
            row,
            transformerNumber,
            error: "รายละเอียด GIS ยาวเกินกำหนด (สูงสุด 500 ตัวอักษร)",
          });
          return null;
        }

        // ตรวจสอบรูปแบบหมายเลขหม้อแปลง
        if (!/^[a-zA-Z0-9\-_\.]+$/.test(transformerNumber)) {
          results.errors.push({
            row,
            transformerNumber,
            error:
              "หมายเลขหม้อแปลงมีตัวอักษรที่ไม่อนุญาต (ใช้ได้เฉพาะ a-z, A-Z, 0-9, -, _, .)",
          });
          return null;
        }

        // Sanitize HTML/Script content
        const cleanGisDetails = gisDetails
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<[^>]*>/g, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "");

        if (!cleanGisDetails.trim()) {
          results.errors.push({ row, transformerNumber, error: "รายละเอียด GIS ว่างเปล่าหลังตรวจสอบข้อมูล" });
          return null;
        }
        return {
          transformerNumber,
          gisDetails: cleanGisDetails.trim(),
          originalRow: row,
        };
      })
      .filter((item) => item !== null);

    // ตรวจสอบว่ามีข้อมูลที่ถูกต้องหรือไม่
    if (sanitizedData.length === 0) {
      return {
        success: false,
        error: "ไม่มีข้อมูลที่ถูกต้องสำหรับการประมวลผล",
        results,
      };
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Validation completed. Processing ${sanitizedData.length} valid records...`,
      );
    }
    reportProgress(0, 1, 0, sanitizedData.length, "กำลังตรวจสอบข้อมูลซ้ำ...");

    // ตรวจสอบ duplicate ภายในข้อมูลที่ส่งมา - ใช้ Map สำหรับประสิทธิภาพ
    const transformerNumbers = sanitizedData.map(
      (item) => item.transformerNumber,
    );
    const duplicateMap = new Map<string, number[]>();

    transformerNumbers.forEach((number, index) => {
      if (!duplicateMap.has(number)) {
        duplicateMap.set(number, []);
      }
      duplicateMap.get(number)!.push(sanitizedData[index].originalRow);
    });

    // รายงาน duplicates และเก็บสถิติ
    duplicateMap.forEach((rows, transformerNumber) => {
      if (rows.length > 1) {
        results.duplicatesList.push({
          transformerNumber,
          rows,
        });
        results.duplicatesRemoved += rows.length - 1;

        for (let i = 1; i < rows.length; i++) {
          results.errors.push({
            row: rows[i],
            transformerNumber,
            error: `หมายเลขหม้อแปลงซ้ำกันในไฟล์ (ใช้ข้อมูลจากแถว ${rows[0]} แทน)`,
          });
        }
      }
    });

    // ลบ duplicate ออกจาก sanitizedData (เก็บแค่รายการแรก)
    const seenNumbers = new Set<string>();
    const uniqueData = sanitizedData.filter((item) => {
      if (seenNumbers.has(item.transformerNumber)) return false;
      seenNumbers.add(item.transformerNumber);
      return true;
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `After removing duplicates: ${uniqueData.length} unique records to process`,
      );
    }
    reportProgress(
      0,
      1,
      0,
      uniqueData.length,
      `พบข้อมูลซ้ำ ${results.duplicatesRemoved} รายการ กำลังเตรียมประมวลผล...`,
    );

    // ปรับปรุง batch processing สำหรับความเร็วสูงสุด
    // สำหรับข้อมูลจำนวนมาก ใช้ batch size ที่ใหญ่ขึ้น
    const BATCH_SIZE = 250;
    const batches = [];

    for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
      batches.push(uniqueData.slice(i, i + BATCH_SIZE));
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Split into ${batches.length} batches of up to ${BATCH_SIZE} records each`,
      );
    }

    // ประมวลผลแต่ละ batch ด้วยประสิทธิภาพสูง
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const currentBatch = batchIndex + 1;

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `Processing batch ${currentBatch}/${batches.length} with ${batch.length} records...`,
        );
      }
      reportProgress(
        currentBatch,
        batches.length,
        results.success,
        uniqueData.length,
        `กำลังประมวลผล batch ${currentBatch}/${batches.length} (${batch.length.toLocaleString()} รายการ)`,
      );

      try {
        // ใช้ High-Performance Bulk Upsert ด้วย UNNEST และ RETURNING
        const committedCounts = await prisma.$transaction(
          async (tx) => {
            // สร้าง arrays สำหรับ UNNEST
            const transformerNumbers = batch.map(
              (item) => item.transformerNumber,
            );
            const gisDetailsArray = batch.map((item) => item.gisDetails);

            // ใช้ Raw SQL ด้วย UNNEST สำหรับ performance สูงสุด
            const upsertQuery = `
            WITH input_data AS (
              SELECT 
                unnest($1::text[]) as transformer_number,
                unnest($2::text[]) as gis_details
            ),
            upserted AS (
              INSERT INTO "Transformer" ("transformerNumber", "gisDetails", "createdAt", "updatedAt")
              SELECT 
                input_data.transformer_number,
                input_data.gis_details,
                NOW(),
                NOW()
              FROM input_data
              ON CONFLICT ("transformerNumber") 
              DO UPDATE SET 
                "gisDetails" = EXCLUDED."gisDetails",
                "updatedAt" = NOW()
              RETURNING 
                "transformerNumber",
                "gisDetails",
                (xmax = 0) as is_insert
            )
            SELECT 
              COUNT(*) FILTER (WHERE is_insert = true) as created_count,
              COUNT(*) FILTER (WHERE is_insert = false) as updated_count
            FROM upserted;
          `;

            const result = (await tx.$queryRawUnsafe(
              upsertQuery,
              transformerNumbers,
              gisDetailsArray,
            )) as Array<{ created_count: bigint; updated_count: bigint }>;

            return assertTransformerUpsertCounts(result, batch.length);
          },
          {
            timeout: 120000, // เพิ่ม timeout เป็น 2 นาทีสำหรับ batch ขนาดใหญ่
          },
        );
        // Credit persistence only after the transaction has committed.
        results.created += committedCounts.created;
        results.updated += committedCounts.updated;
        results.success += committedCounts.created + committedCounts.updated;
        reportProgress(currentBatch, batches.length, results.success, uniqueData.length, `บันทึกแล้ว ${results.success}/${uniqueData.length} รายการ`);
      } catch (error) {
        console.error(`Error processing batch ${currentBatch}:`, error);

        // บันทึกข้อผิดพลาดสำหรับทั้ง batch
        for (const item of batch) {
          results.errors.push({
            row: item.originalRow,
            transformerNumber: item.transformerNumber,
            error: `เกิดข้อผิดพลาดในการประมวลผล batch ${currentBatch}: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `High-performance bulk processing completed. Total processed: ${results.success}, Errors: ${results.errors.length}`,
      );
    }

    // Final progress report
    reportProgress(
      batches.length,
      batches.length,
      results.success,
      uniqueData.length,
      "การประมวลผลเสร็จสิ้น - ใช้เทคนิค UNNEST สำหรับประสิทธิภาพสูงสุด",
    );

    const completelySuccessful = results.success > 0 && results.errors.length === 0;
    return {
      success: completelySuccessful,
      ...(completelySuccessful ? {} : { error: results.success > 0 ? "นำเข้าสำเร็จบางส่วน โปรดตรวจสอบรายการที่ผิดพลาด" : "ไม่มีรายการที่บันทึกสำเร็จ" }),
      results,
      message: `ประมวลผลแบบ High-Performance: ${uniqueData.length.toLocaleString()} รายการ สำเร็จ ${results.success.toLocaleString()} รายการ (สร้างใหม่ ${results.created.toLocaleString()}, อัพเดท ${results.updated.toLocaleString()})${results.duplicatesRemoved > 0 ? `, ลบข้อมูลซ้ำ ${results.duplicatesRemoved.toLocaleString()} รายการ` : ""}, ผิดพลาด ${results.errors.length.toLocaleString()} รายการ`,
    };
  } catch (error) {
    console.error("Failed to bulk upsert transformers:", error);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลจำนวนมาก",
      results: {
        success: 0,
        updated: 0,
        created: 0,
        errors: [],
        duplicatesRemoved: 0,
        duplicatesList: [],
      },
    };
  }
}

export async function resetUserPassword(_userId: number) {
  try { await requireAdmin(); }
  catch { return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ" }; }
  return { success: false, error: "การรีเซ็ตรหัสผ่านแบบเดิมถูกปิดใช้งาน กรุณาใช้ขั้นตอนตั้งรหัสผ่านที่ปลอดภัย" };
}

export async function checkEmployeeIdExists(employeeId: string) {
  try {
    await requireAdmin();
    if (!employeeId || employeeId.length < 6) {
      return { exists: false, message: "" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { employeeId: employeeId.trim() },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        workCenter: {
          select: { name: true },
        },
      },
    });

    if (existingUser) {
      return {
        exists: true,
        message: `รหัสพนักงานนี้ใช้แล้วโดย "${existingUser.fullName}" (${existingUser.workCenter.name})`,
        user: existingUser,
      };
    }

    return {
      exists: false,
      message: "รหัสพนักงานนี้สามารถใช้ได้",
      user: null,
    };
  } catch (error) {
    console.error("Failed to check employee ID:", error);
    return {
      exists: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบรหัสพนักงาน",
      error: true,
    };
  }
}
