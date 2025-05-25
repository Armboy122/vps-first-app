"use server";

import prisma from "@/lib/prisma";
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
  PowerOutageRequestUpdateSchema,
} from "@/lib/validations/powerOutageRequest";
import { getServerSession } from "next-auth";

import { OMSStatus , Request } from '@prisma/client';
import { authOptions } from "@/authOption";
import { createThailandDateTime, getThailandDate, getThailandDateAtMidnight } from "@/lib/date-utils";
import { clearOMSCache } from "@/lib/cache-utils";
import { z } from "zod";

// ฟังก์ชันสำหรับ getCurrentUser
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized: No session found");
  }

  const employeeId = session.user.employeeId;
  const user = await prisma.user.findUnique({
    where: { employeeId: employeeId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
//สร้างคำขอดับไฟ
export async function createPowerOutageRequest(data: PowerOutageRequestInput) {
  const currentUser = await getCurrentUser();

  try {
    console.log("Creating power outage request with data:", data);
    const validatedData = PowerOutageRequestSchema.parse(data);

    // แปลงเวลาเป็น timezone ของไทย โดยใช้ date-utils
    const outageDate = new Date(validatedData.outageDate);
    const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
    const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);

    console.log("Timezone check:");
    console.log("- outageDate:", outageDate.toISOString(), "(UTC)");
    console.log("- startTime:", startTime.toISOString(), "(should be UTC+7)");
    console.log("- endTime:", endTime.toISOString(), "(should be UTC+7)");
    console.log("- startTime local:", startTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
    console.log("- endTime local:", endTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));

    // ตรวจสอบว่าวันที่ดับไฟต้องมากกว่า 10 วันจากวันปัจจุบัน
    const today = getThailandDateAtMidnight();
    const diffTime = outageDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log("Date validation - diffDays:", diffDays, "outageDate:", outageDate, "today:", today);

    if (diffDays < 10) {
      console.log("Date validation failed - diffDays < 10");
      return { 
        success: false, 
        error: "ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องมากกว่า 10 วันจากวันปัจจุบัน" 
      };
    }

    const result = await prisma.powerOutageRequest.create({
      data: {
        ...validatedData,
        outageDate,
        startTime,
        endTime,
        workCenterId: Number(validatedData.workCenterId),
        branchId: Number(validatedData.branchId),
        createdById: currentUser.id,
        omsStatus: "NOT_ADDED",
      },
    });

    console.log("Power outage request created successfully:", result.id);

    // ล้างแคช OMS หลังจากสร้างคำขอดับไฟ
    clearOMSCache();

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create power outage request:", error);
    
    // ตรวจสอบว่าเป็น validation error หรือไม่
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => err.message).join(', ');
      return { success: false, error: `ข้อมูลไม่ถูกต้อง: ${errorMessages}` };
    }
    
    // ตรวจสอบว่าเป็น Prisma error หรือไม่
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return { success: false, error: "ข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ" };
      }
    }
    
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ" };
  }
}

// ดรอปดาวน์หม้อแปลง
export async function searchTransformers(searchTerm: string) {
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
  } catch (error) {
    console.error("Error searching transformers:", error);
    throw error;
  }
}

export async function getPowerOutageRequests() {
  try {
    // ใช้ getThailandDateAtMidnight แทน new Date สำหรับวันที่ปัจจุบันในไทม์โซน UTC+7
    const today = getThailandDateAtMidnight();

    const data = await prisma.powerOutageRequest.findMany({
      include: {
        createdBy: { select: { fullName: true } },
        workCenter: { select: { name: true, id: true } },
        branch: { select: { shortName: true } },
      },
    });

    // เรียงลำดับข้อมูลตามเงื่อนไข
    const sortedData = data.sort((a, b) => {
      const aOutageDate = new Date(a.outageDate);
      const bOutageDate = new Date(b.outageDate);

      // ตรวจสอบสถานะ PROCESSED และ CONFIRM
      const aIsProcessedAndConfirm = a.omsStatus === "PROCESSED" && a.statusRequest === "CONFIRM";
      const bIsProcessedAndConfirm = b.omsStatus === "PROCESSED" && b.statusRequest === "CONFIRM";

      // ถ้าทั้งคู่เป็น PROCESSED และ CONFIRM ให้เรียงตาม createdAt
      if (aIsProcessedAndConfirm && bIsProcessedAndConfirm) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      // ถ้าอันใดอันหนึ่งเป็น PROCESSED และ CONFIRM ให้ไว้ท้ายสุด
      if (aIsProcessedAndConfirm) return 1;
      if (bIsProcessedAndConfirm) return -1;

      // เรียง CONFIRM ก่อน (ยกเว้น PROCESSED)
      if (a.statusRequest === 'CONFIRM' && b.statusRequest !== 'CONFIRM') return -1;
      if (a.statusRequest !== 'CONFIRM' && b.statusRequest === 'CONFIRM') return 1;

      // ถ้าทั้งคู่เป็น CONFIRM
      if (a.statusRequest === 'CONFIRM' && b.statusRequest === 'CONFIRM') {
        // ถ้าทั้งคู่ยังไม่ถึงวันที่ outageDate
        if (aOutageDate >= today && bOutageDate >= today) {
          return aOutageDate.getTime() - bOutageDate.getTime(); // เรียงจากใกล้ไปไกล
        }
        // ถ้าทั้งคู่ผ่านวันที่ outageDate ไปแล้ว
        if (aOutageDate < today && bOutageDate < today) {
          return bOutageDate.getTime() - aOutageDate.getTime(); // เรียงจากไกลไปใกล้
        }
        // ถ้าอันหนึ่งยังไม่ถึง และอีกอันผ่านไปแล้ว
        return aOutageDate >= today ? -1 : 1; // อันที่ยังไม่ถึงอยู่ก่อน
      }

      // สำหรับรายการที่ไม่ใช่ CONFIRM
      return b.createdAt.getTime() - a.createdAt.getTime(); // เรียงตาม createdAt จากใหม่ไปเก่า
    });

    return sortedData;
  } catch (error) {
    console.error("Failed to fetch power outage requests:", error);
    throw new Error("Failed to fetch power outage requests");
  }
}

export async function deletePowerOutageRequest(id: number) {
  try {
    await prisma.powerOutageRequest.delete({
      where: { id },
    });

    // ล้างแคช OMS หลังจากลบคำขอดับไฟ
    clearOMSCache();

    return { success: true, message: "คำขอถูกลบเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("Error deleting power outage request:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบคำขอ" };
  }
}

export async function updatePowerOutageRequest(
  id: number,
  data: PowerOutageRequestInput
) {
  try {
    const validatedData = PowerOutageRequestUpdateSchema.pick({
      outageDate: true,
      startTime: true,
      endTime: true,
      area: true,
    }).parse(data);

    // แปลงเวลาเป็น timezone ของไทย โดยใช้ date-utils
    const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
    const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Invalid time format");
    }

    const updatedRequest = await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        startTime,
        endTime,
        area: validatedData.area,
      },
    });

    // ล้างแคช OMS หลังจากอัปเดตคำขอดับไฟ
    clearOMSCache();

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Failed to update power outage request:", error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        error: "An unknown error occurred while updating the power outage request",
      };
    }
  }
}

export async function updateOMS(id: number, omsStatus: OMSStatus) {
  const currentUser = await getCurrentUser();
  try {
    const updatedRequest = await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        omsStatus,
        omsUpdatedAt: getThailandDate(),
        omsUpdatedById: currentUser.id
      },
    });

    // ล้างแคช OMS หลังจากอัปเดตสถานะ OMS
    clearOMSCache();

    console.log("Updated OMS status:", updatedRequest);

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Failed to update OMS status:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        error: "An unknown error occurred while updating the OMS status",
      };
    }
  }
}

export async function updateStatusRequest(id: number, statusRequest: Request) {
  const currentUser = await getCurrentUser();
  try {
    const updatedRequest = await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        statusRequest,
        statusUpdatedAt: getThailandDate(),
        statusUpdatedById: currentUser.id
      },
    });

    // ล้างแคช OMS หลังจากอัปเดตสถานะคำขอ
    clearOMSCache();

    console.log("Updated status request:", updatedRequest);

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Failed to update status request:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        error: "An unknown error occurred while updating the status request",
      };
    }
  }
}

// สร้างคำขอดับไฟหลายรายการพร้อมกัน (Batch Processing)
export async function createMultiplePowerOutageRequests(dataList: PowerOutageRequestInput[]) {
  const currentUser = await getCurrentUser();

  try {
    console.log("Creating multiple power outage requests:", dataList.length, "items");

    // Validate ข้อมูลทั้งหมดก่อน
    const validatedDataList: Array<{
      outageDate: Date;
      startTime: Date;
      endTime: Date;
      workCenterId: number;
      branchId: number;
      transformerNumber: string;
      gisDetails: string;
      area: string | null;
      createdById: number;
      omsStatus: "NOT_ADDED";
    }> = [];
    const validationErrors: Array<{
      index: number;
      error: string;
      data: any;
    }> = [];

    for (let i = 0; i < dataList.length; i++) {
      try {
        const validatedData = PowerOutageRequestSchema.parse(dataList[i]);
        
        // ตรวจสอบวันที่สำหรับแต่ละรายการ
        const outageDate = new Date(validatedData.outageDate);
        const today = getThailandDateAtMidnight();
        const diffTime = outageDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 10) {
          validationErrors.push({
            index: i + 1,
            error: "วันที่ดับไฟต้องมากกว่า 10 วันจากวันปัจจุบัน",
            data: validatedData
          });
          continue;
        }

        // แปลงเวลาเป็น timezone ของไทย
        const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
        const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);

        validatedDataList.push({
          ...validatedData,
          outageDate,
          startTime,
          endTime,
          workCenterId: Number(validatedData.workCenterId),
          branchId: Number(validatedData.branchId),
          createdById: currentUser.id,
          omsStatus: "NOT_ADDED" as const,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => err.message).join(', ');
          validationErrors.push({
            index: i + 1,
            error: `ข้อมูลไม่ถูกต้อง: ${errorMessages}`,
            data: dataList[i]
          });
        } else {
          validationErrors.push({
            index: i + 1,
            error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล",
            data: dataList[i]
          });
        }
      }
    }

    // ถ้ามี validation errors ส่งกลับทันที
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "พบข้อผิดพลาดในการตรวจสอบข้อมูล",
        validationErrors,
        successCount: 0,
        totalCount: dataList.length
      };
    }

    // ใช้ Transaction เพื่อบันทึกข้อมูลทั้งหมดพร้อมกัน
    const results = await prisma.$transaction(async (tx) => {
      const createdRequests = [];
      
      for (const data of validatedDataList) {
        const result = await tx.powerOutageRequest.create({
          data,
        });
        createdRequests.push(result);
      }
      
      return createdRequests;
    });

    console.log("Successfully created", results.length, "power outage requests");

    // ล้างแคช OMS หลังจากสร้างคำขอดับไฟ
    clearOMSCache();

    return {
      success: true,
      data: results,
      successCount: results.length,
      totalCount: dataList.length,
      message: `บันทึกคำขอดับไฟสำเร็จทั้งหมด ${results.length} รายการ`
    };

  } catch (error) {
    console.error("Failed to create multiple power outage requests:", error);
    
    // ตรวจสอบว่าเป็น Prisma error หรือไม่
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return { 
          success: false, 
          error: "พบข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ",
          successCount: 0,
          totalCount: dataList.length
        };
      }
    }
    
    return { 
      success: false, 
      error: "เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ",
      successCount: 0,
      totalCount: dataList.length
    };
  }
}
