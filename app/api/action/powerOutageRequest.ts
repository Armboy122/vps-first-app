"use server";

import prisma from "@/lib/prisma";
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { getServerSession } from "next-auth";

import { OMSStatus , Request } from '@prisma/client';
import { authOptions } from "@/authOption";

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
    const validatedData = PowerOutageRequestSchema.parse(data);

    // แปลงเวลาเป็น timezone ของไทย
    const outageDate = new Date(validatedData.outageDate);
    const startTime = new Date(`${validatedData.outageDate}T${validatedData.startTime}+07:00`);
    const endTime = new Date(`${validatedData.outageDate}T${validatedData.endTime}+07:00`);

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

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create power outage request:", error);
    return { success: false, error: "Failed to create power outage request" };
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    const validatedData = PowerOutageRequestSchema.pick({
      outageDate: true,
      startTime: true,
      endTime: true,
      area: true,
    }).parse(data);

    // แปลงเวลาเป็น timezone ของไทย
    const startTime = new Date(`${validatedData.outageDate}T${validatedData.startTime}+07:00`);
    const endTime = new Date(`${validatedData.outageDate}T${validatedData.endTime}+07:00`);

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
        omsUpdatedAt: new Date(),
        omsUpdatedById: currentUser.id
      },
    });

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
        statusUpdatedAt: new Date(),
        statusUpdatedById: currentUser.id
      },
    });

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
