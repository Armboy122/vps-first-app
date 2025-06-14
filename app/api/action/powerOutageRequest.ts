"use server";

import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
  PowerOutageRequestUpdateSchema,
} from "@/lib/validations/powerOutageRequest";
import { getServerSession } from "next-auth";
import { OMSStatus, Request } from "@prisma/client";
import { authOptions } from "@/authOption";
import { createThailandDateTime } from "@/lib/date-utils";
import { clearOMSCache } from "@/lib/cache-utils";
import { z } from "zod";
import {
  PowerOutageRequestService,
  TransformerService,
  UserService,
} from "@/lib/services";
import prisma from "@/lib/prisma";

// ฟังก์ชันสำหรับ getCurrentUser
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized: No session found");
  }

  const user = await UserService.getUserByEmployeeId(session.user.employeeId);
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
    const startTime = createThailandDateTime(
      validatedData.outageDate,
      validatedData.startTime,
    );
    const endTime = createThailandDateTime(
      validatedData.outageDate,
      validatedData.endTime,
    );

    // ตรวจสอบวันที่ดับไฟ
    const validation = PowerOutageRequestService.validateOutageDate(outageDate);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // สร้างคำขอดับไฟ
    const result = await PowerOutageRequestService.createRequest({
      outageDate,
      startTime,
      endTime,
      workCenterId: Number(validatedData.workCenterId),
      branchId: Number(validatedData.branchId),
      transformerNumber: validatedData.transformerNumber,
      gisDetails: validatedData.gisDetails,
      area: validatedData.area,
      createdById: currentUser.id,
    });

    // ล้างแคช OMS หลังจากสร้างคำขอดับไฟ
    clearOMSCache();

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create power outage request:", error);

    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return { success: false, error: `ข้อมูลไม่ถูกต้อง: ${errorMessages}` };
    }

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
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

export async function getPowerOutageRequests(
  page: number = 1,
  limit: number = 50,
  filters?: {
    workCenterId?: number;
    omsStatus?: OMSStatus;
    statusRequest?: Request;
    startDate?: Date;
    endDate?: Date;
  },
) {
  try {
    // Ensure page and limit are numbers and have valid values
    const validPage = Math.max(1, Number(page) || 1);
    const validLimit = Math.max(1, Math.min(10000, Number(limit) || 50));
    
    // ใช้ service layer สำหรับ pagination
    const result = await PowerOutageRequestService.getPaginatedRequests(
      { page: validPage, limit: validLimit },
      filters,
    );

    // ใช้ business logic สำหรับ sorting ที่ซับซ้อน
    const sortedData = PowerOutageRequestService.sortRequests(result.data);

    return {
      data: sortedData,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("Failed to fetch power outage requests:", error);
    throw new Error("Failed to fetch power outage requests");
  }
}

export async function deletePowerOutageRequest(id: number) {
  try {
    await PowerOutageRequestService.deleteRequest(id);

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
  data: PowerOutageRequestInput,
) {
  try {
    const validatedData = PowerOutageRequestUpdateSchema.pick({
      outageDate: true,
      startTime: true,
      endTime: true,
      area: true,
    }).parse(data);

    // แปลงเวลาเป็น timezone ของไทย โดยใช้ date-utils
    const startTime = createThailandDateTime(
      validatedData.outageDate,
      validatedData.startTime,
    );
    const endTime = createThailandDateTime(
      validatedData.outageDate,
      validatedData.endTime,
    );

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Invalid time format");
    }

    const updatedRequest = await PowerOutageRequestService.updateRequest(id, {
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
        error:
          "An unknown error occurred while updating the power outage request",
      };
    }
  }
}

export async function updateOMS(id: number, omsStatus: OMSStatus) {
  const currentUser = await getCurrentUser();
  try {
    const updatedRequest = await PowerOutageRequestService.updateOMSStatus(
      id,
      omsStatus,
      currentUser.id,
    );

    // ล้างแคช OMS หลังจากอัปเดตสถานะ OMS
    clearOMSCache();

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
    const updatedRequest = await PowerOutageRequestService.updateRequestStatus(
      id,
      statusRequest,
      currentUser.id,
    );

    // ล้างแคช OMS หลังจากอัปเดตสถานะคำขอ
    clearOMSCache();

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
export async function createMultiplePowerOutageRequests(
  dataList: PowerOutageRequestInput[],
) {
  const currentUser = await getCurrentUser();

  try {
    console.log(
      "Creating multiple power outage requests:",
      dataList.length,
      "items",
    );

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
        const validation =
          PowerOutageRequestService.validateOutageDate(outageDate);

        if (!validation.isValid) {
          validationErrors.push({
            index: i + 1,
            error: validation.error!,
            data: validatedData,
          });
          continue;
        }

        // แปลงเวลาเป็น timezone ของไทย
        const startTime = createThailandDateTime(
          validatedData.outageDate,
          validatedData.startTime,
        );
        const endTime = createThailandDateTime(
          validatedData.outageDate,
          validatedData.endTime,
        );

        validatedDataList.push({
          outageDate,
          startTime,
          endTime,
          workCenterId: Number(validatedData.workCenterId),
          branchId: Number(validatedData.branchId),
          transformerNumber: validatedData.transformerNumber,
          gisDetails: validatedData.gisDetails,
          area: validatedData.area,
          createdById: currentUser.id,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors
            .map((err) => err.message)
            .join(", ");
          validationErrors.push({
            index: i + 1,
            error: `ข้อมูลไม่ถูกต้อง: ${errorMessages}`,
            data: dataList[i],
          });
        } else {
          validationErrors.push({
            index: i + 1,
            error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล",
            data: dataList[i],
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
        totalCount: dataList.length,
      };
    }

    // ใช้ service layer สำหรับสร้างหลายรายการ
    const results =
      await PowerOutageRequestService.createMultipleRequests(validatedDataList);

    console.log(
      "Successfully created",
      results.length,
      "power outage requests",
    );

    // ล้างแคช OMS หลังจากสร้างคำขอดับไฟ
    clearOMSCache();

    return {
      success: true,
      data: results,
      successCount: results.length,
      totalCount: dataList.length,
      message: `บันทึกคำขอดับไฟสำเร็จทั้งหมด ${results.length} รายการ`,
    };
  } catch (error) {
    console.error("Failed to create multiple power outage requests:", error);

    // ตรวจสอบว่าเป็น Prisma error หรือไม่
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "พบข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ",
          successCount: 0,
          totalCount: dataList.length,
        };
      }
    }

    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการสร้างคำขอดับไฟ",
      successCount: 0,
      totalCount: dataList.length,
    };
  }
}
