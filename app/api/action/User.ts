"use server";

import { hash, compare } from "bcryptjs";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";

import { CreateUserInput, CreateUserSchema } from "@/lib/validations/user";
import { Role } from "@prisma/client";
import { authOptions } from "@/authOption";

export async function createUser(input: CreateUserInput) {
  try {
    // Validate input
    const validatedData = await CreateUserSchema.parseAsync(input);

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

export async function getUsers(page = 1, pageSize = 10, search = '', workCenterId = '') {
  const skip = (page - 1) * pageSize;
  try {
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { employeeId: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ],
          workCenterId: workCenterId ? parseInt(workCenterId) : undefined
        },
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          role: true,
          workCenter: {
            select: {
              name: true
            }
          },
          branch: {
            select: {
              fullName: true
            }
          }
        },
        skip,
        take: pageSize,
      }),
      prisma.user.count({
        where: {
          OR: [
            { employeeId: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ],
          workCenterId: workCenterId ? parseInt(workCenterId) : undefined
        }
      })
    ]);

    return { users, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { users: [], totalCount: 0, totalPages: 0 };
  }
}

export async function updateUserRole(userId: number, newRole: Role) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, fullName: true, role: true }
    });
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function updateUserName(userId: number, newName: string) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { fullName: newName },
      select: { id: true, fullName: true }
    });
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user name:", error);
    return { success: false, error: "Failed to update user name" };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
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
      data: { password: hashedNewPassword }
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

export async function updateUserProfile(
  data: {
    fullName?: string;
    employeeId?: string;
    workCenterId?: number;
    branchId?: number;
  }
) {
  try {
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
          id: { not: userId }
        }
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
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            fullName: true,
            shortName: true
          }
        },
        role: true
      }
    });

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "Failed to update user profile" };
  }
}

export async function getCurrentUser() {
  try {
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
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            fullName: true,
            shortName: true
          }
        }
      }
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

export async function getTransformers(page = 1, pageSize = 10, search = '') {
  const skip = (page - 1) * pageSize;
  try {
    const [transformers, totalCount] = await Promise.all([
      prisma.transformer.findMany({
        where: {
          OR: [
            { transformerNumber: { contains: search, mode: 'insensitive' } },
            { gisDetails: { contains: search, mode: 'insensitive' } },
          ],
        },
        skip,
        take: pageSize,
        orderBy: { transformerNumber: 'asc' },
      }),
      prisma.transformer.count({
        where: {
          OR: [
            { transformerNumber: { contains: search, mode: 'insensitive' } },
            { gisDetails: { contains: search, mode: 'insensitive' } },
          ],
        }
      })
    ]);

    return { transformers, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
  } catch (error) {
    console.error("Failed to fetch transformers:", error);
    return { transformers: [], totalCount: 0, totalPages: 0 };
  }
}

export async function createTransformer(data: { transformerNumber: string; gisDetails: string }) {
  try {
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

export async function updateTransformer(id: number, data: { transformerNumber: string; gisDetails: string }) {
  try {
    // ตรวจสอบว่า transformerNumber ใหม่ไม่ซ้ำกับของอื่น
    const existingTransformer = await prisma.transformer.findFirst({
      where: { 
        transformerNumber: data.transformerNumber.trim(),
        id: { not: id }
      }
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
    // ตรวจสอบว่ามีการใช้งานในคำขอดับไฟหรือไม่
    const relatedRequests = await prisma.powerOutageRequest.findMany({
      where: { transformer: { id } },
      take: 1,
    });

    if (relatedRequests.length > 0) {
      return { success: false, error: "ไม่สามารถลบได้เนื่องจากมีการใช้งานในคำขอดับไฟอยู่" };
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
  }) => void
) {
  try {
    // ตรวจสอบการ authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "ไม่มีสิทธิ์เข้าถึง", results: { success: 0, updated: 0, created: 0, errors: [] } };
    }

    // ตรวจสอบสิทธิ์ admin
    if (session.user.role !== 'ADMIN') {
      return { success: false, error: "ไม่มีสิทธิ์ในการอัพโหลดข้อมูลจำนวนมาก", results: { success: 0, updated: 0, created: 0, errors: [] } };
    }

    // ตรวจสอบจำนวนข้อมูลที่ส่งมา - เพิ่มขีดจำกัดสำหรับข้อมูลจำนวนมาก
    if (!data || !Array.isArray(data)) {
      return { success: false, error: "ข้อมูลไม่ถูกต้อง", results: { success: 0, updated: 0, created: 0, errors: [] } };
    }

    if (data.length === 0) {
      return { success: false, error: "ไม่มีข้อมูลที่จะประมวลผล", results: { success: 0, updated: 0, created: 0, errors: [] } };
    }

    // เพิ่มขีดจำกัดเป็น 100,000 รายการ สำหรับข้อมูลจำนวนมากขึ้น
    if (data.length > 100000) {
      return { success: false, error: "จำนวนข้อมูลเกินกำหนด (สูงสุด 100,000 รายการ) กรุณาแบ่งไฟล์เป็นส่วนๆ", results: { success: 0, updated: 0, created: 0, errors: [] } };
    }

    const results = {
      success: 0,
      updated: 0,
      created: 0,
      errors: [] as Array<{ row: number; transformerNumber: string; error: string }>,
      duplicatesRemoved: 0,
      duplicatesList: [] as Array<{ transformerNumber: string; rows: number[] }>
    };

    // Progress callback helper
    const reportProgress = (currentBatch: number, totalBatches: number, processedRecords: number, totalRecords: number, operation: string) => {
      if (onProgress) {
        onProgress({
          currentBatch,
          totalBatches,
          processedRecords,
          totalRecords,
          currentOperation: operation
        });
      }
    };

    // ตรวจสอบและ sanitize ข้อมูลก่อนประมวลผล
    console.log(`Starting validation for ${data.length} records...`);
    reportProgress(0, 1, 0, data.length, 'กำลังตรวจสอบความถูกต้องของข้อมูล...');
    
    const sanitizedData = data.map((item, index) => {
      const row = index + 1;
      
      // ตรวจสอบประเภทข้อมูล
      if (typeof item !== 'object' || item === null) {
        results.errors.push({
          row,
          transformerNumber: '',
          error: 'รูปแบบข้อมูลไม่ถูกต้อง'
        });
        return null;
      }

      const transformerNumber = String(item.transformerNumber || '').trim();
      const gisDetails = String(item.gisDetails || '').trim();

      // ตรวจสอบข้อมูลว่าง
      if (!transformerNumber || !gisDetails) {
        results.errors.push({
          row,
          transformerNumber: transformerNumber || '',
          error: 'ข้อมูลไม่ครบถ้วน (ต้องมีทั้งหมายเลขหม้อแปลงและรายละเอียด GIS)'
        });
        return null;
      }

      // ตรวจสอบความยาวข้อมูล
      if (transformerNumber.length > 100) {
        results.errors.push({
          row,
          transformerNumber,
          error: 'หมายเลขหม้อแปลงยาวเกินกำหนด (สูงสุด 100 ตัวอักษร)'
        });
        return null;
      }

      if (gisDetails.length > 500) {
        results.errors.push({
          row,
          transformerNumber,
          error: 'รายละเอียด GIS ยาวเกินกำหนด (สูงสุด 500 ตัวอักษร)'
        });
        return null;
      }

      // ตรวจสอบรูปแบบหมายเลขหม้อแปลง
      if (!/^[a-zA-Z0-9\-_\.]+$/.test(transformerNumber)) {
        results.errors.push({
          row,
          transformerNumber,
          error: 'หมายเลขหม้อแปลงมีตัวอักษรที่ไม่อนุญาต (ใช้ได้เฉพาะ a-z, A-Z, 0-9, -, _, .)'
        });
        return null;
      }

      // Sanitize HTML/Script content
      const cleanGisDetails = gisDetails
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

      return {
        transformerNumber,
        gisDetails: cleanGisDetails.trim(),
        originalRow: row
      };
    }).filter(item => item !== null);

    // ตรวจสอบว่ามีข้อมูลที่ถูกต้องหรือไม่
    if (sanitizedData.length === 0) {
      return {
        success: false,
        error: "ไม่มีข้อมูลที่ถูกต้องสำหรับการประมวลผล",
        results
      };
    }

    console.log(`Validation completed. Processing ${sanitizedData.length} valid records...`);
    reportProgress(0, 1, 0, sanitizedData.length, 'กำลังตรวจสอบข้อมูลซ้ำ...');

    // ตรวจสอบ duplicate ภายในข้อมูลที่ส่งมา - ใช้ Map สำหรับประสิทธิภาพ
    const transformerNumbers = sanitizedData.map(item => item.transformerNumber);
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
          rows
        });
        results.duplicatesRemoved += rows.length - 1;
        
        for (let i = 1; i < rows.length; i++) {
          results.errors.push({
            row: rows[i],
            transformerNumber,
            error: `หมายเลขหม้อแปลงซ้ำกันในไฟล์ (ใช้ข้อมูลจากแถว ${rows[0]} แทน)`
          });
        }
      }
    });

    // ลบ duplicate ออกจาก sanitizedData (เก็บแค่รายการแรก)
    const uniqueData = sanitizedData.filter((item, index) => {
      const firstIndex = transformerNumbers.indexOf(item.transformerNumber);
      return firstIndex === index;
    });

    console.log(`After removing duplicates: ${uniqueData.length} unique records to process`);
    reportProgress(0, 1, 0, uniqueData.length, `พบข้อมูลซ้ำ ${results.duplicatesRemoved} รายการ กำลังเตรียมประมวลผล...`);

    // ปรับปรุง batch processing สำหรับความเร็วสูงสุด
    // สำหรับข้อมูลจำนวนมาก ใช้ batch size ที่ใหญ่ขึ้น
    const determineBatchSize = (totalRecords: number): number => {
      if (totalRecords < 1000) return 250;      // batch เล็กสำหรับข้อมูลน้อย
      if (totalRecords < 5000) return 500;      // batch ปานกลาง
      if (totalRecords < 20000) return 1000;    // batch ใหญ่สำหรับข้อมูลปานกลาง
      return 2000;                             // batch ใหญ่สุดสำหรับข้อมูลจำนวนมาก
    };

    const BATCH_SIZE = determineBatchSize(uniqueData.length);
    const batches = [];
    
    for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
      batches.push(uniqueData.slice(i, i + BATCH_SIZE));
    }

    console.log(`Split into ${batches.length} batches of up to ${BATCH_SIZE} records each`);

    // ประมวลผลแต่ละ batch ด้วยประสิทธิภาพสูง
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const currentBatch = batchIndex + 1;
      
      console.log(`Processing batch ${currentBatch}/${batches.length} with ${batch.length} records...`);
      reportProgress(
        currentBatch, 
        batches.length, 
        batchIndex * BATCH_SIZE, 
        uniqueData.length, 
        `กำลังประมวลผล batch ${currentBatch}/${batches.length} (${batch.length.toLocaleString()} รายการ)`
      );

      try {
        // ใช้ High-Performance Bulk Upsert ด้วย UNNEST และ RETURNING
        await prisma.$transaction(async (tx) => {
          // สร้าง arrays สำหรับ UNNEST
          const transformerNumbers = batch.map(item => item.transformerNumber);
          const gisDetailsArray = batch.map(item => item.gisDetails);

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

          const result = await tx.$queryRawUnsafe(
            upsertQuery,
            transformerNumbers,
            gisDetailsArray
          ) as Array<{ created_count: bigint; updated_count: bigint }>;

          if (result && result.length > 0) {
            const createdCount = Number(result[0].created_count);
            const updatedCount = Number(result[0].updated_count);
            
            results.created += createdCount;
            results.updated += updatedCount;
            results.success += batch.length;

            console.log(`Batch ${currentBatch} completed: Created ${createdCount}, Updated ${updatedCount}`);
          } else {
            // Fallback ถ้า query ไม่ return ผลลัพธ์ที่คาดหวัง
            console.warn(`Batch ${currentBatch}: No result returned, assuming all records processed`);
            results.success += batch.length;
            results.created += batch.length; // สมมติว่าเป็นการสร้างใหม่
          }
          
          // Report progress after completing batch with 500-record granularity
          const processedSoFar = (batchIndex + 1) * BATCH_SIZE;
          reportProgress(
            currentBatch, 
            batches.length, 
            Math.min(processedSoFar, uniqueData.length), 
            uniqueData.length, 
            `เสร็จสิ้น batch ${currentBatch}/${batches.length} - ประมวลผลแล้ว ${Math.min(processedSoFar, uniqueData.length).toLocaleString()}/${uniqueData.length.toLocaleString()} รายการ`
          );
        }, {
          timeout: 120000, // เพิ่ม timeout เป็น 2 นาทีสำหรับ batch ขนาดใหญ่
        });

      } catch (error) {
        console.error(`Error processing batch ${currentBatch}:`, error);
        
        // บันทึกข้อผิดพลาดสำหรับทั้ง batch
        for (const item of batch) {
          results.errors.push({
            row: item.originalRow,
            transformerNumber: item.transformerNumber,
            error: `เกิดข้อผิดพลาดในการประมวลผล batch ${currentBatch}: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }

    console.log(`High-performance bulk processing completed. Total processed: ${results.success}, Errors: ${results.errors.length}`);

    // Final progress report
    reportProgress(
      batches.length, 
      batches.length, 
      uniqueData.length, 
      uniqueData.length, 
      'การประมวลผลเสร็จสิ้น - ใช้เทคนิค UNNEST สำหรับประสิทธิภาพสูงสุด'
    );

    return {
      success: true,
      results,
      message: `ประมวลผลแบบ High-Performance: ${uniqueData.length.toLocaleString()} รายการ สำเร็จ ${results.success.toLocaleString()} รายการ (สร้างใหม่ ${results.created.toLocaleString()}, อัพเดท ${results.updated.toLocaleString()})${results.duplicatesRemoved > 0 ? `, ลบข้อมูลซ้ำ ${results.duplicatesRemoved.toLocaleString()} รายการ` : ''}, ผิดพลาด ${results.errors.length.toLocaleString()} รายการ`
    };

  } catch (error) {
    console.error("Failed to bulk upsert transformers:", error);
    return { 
      success: false, 
      error: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลจำนวนมาก",
      results: { success: 0, updated: 0, created: 0, errors: [], duplicatesRemoved: 0, duplicatesList: [] }
    };
  }
}

export async function resetUserPassword(userId: number) {
  try {
    // ดึงข้อมูลผู้ใช้เพื่อเอารหัสพนักงาน
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true, fullName: true }
    });

    if (!user) {
      return { success: false, error: "ไม่พบผู้ใช้" };
    }

    // ใช้รหัสพนักงานเป็นรหัสผ่านใหม่
    const newPassword = user.employeeId;
    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { success: true, message: `รีเซ็ตรหัสผ่านของ ${user.fullName} เรียบร้อยแล้ว รหัสผ่านใหม่คือ: ${newPassword}` };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" };
  }
}

export async function checkEmployeeIdExists(employeeId: string) {
  try {
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
          select: { name: true }
        }
      }
    });

    if (existingUser) {
      return { 
        exists: true, 
        message: `รหัสพนักงานนี้ใช้แล้วโดย "${existingUser.fullName}" (${existingUser.workCenter.name})`,
        user: existingUser
      };
    }

    return { 
      exists: false, 
      message: "รหัสพนักงานนี้สามารถใช้ได้",
      user: null
    };
  } catch (error) {
    console.error("Failed to check employee ID:", error);
    return { 
      exists: false, 
      message: "เกิดข้อผิดพลาดในการตรวจสอบรหัสพนักงาน",
      error: true
    };
  }
}