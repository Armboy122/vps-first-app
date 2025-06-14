import prisma from "@/lib/prisma";
import {
  OMSStatus,
  Request,
  PowerOutageRequest,
  User,
  WorkCenter,
  Branch,
} from "@prisma/client";
import { getThailandDateAtMidnight } from "@/lib/date-utils";

// Types
export interface PowerOutageRequestWithRelations extends PowerOutageRequest {
  createdBy: Pick<User, "fullName">;
  workCenter: Pick<WorkCenter, "name" | "id">;
  branch: Pick<Branch, "shortName">;
}

export interface PowerOutageRequestFilters {
  workCenterId?: number;
  omsStatus?: OMSStatus;
  statusRequest?: Request;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreatePowerOutageRequestData {
  outageDate: Date;
  startTime: Date;
  endTime: Date;
  workCenterId: number;
  branchId: number;
  transformerNumber: string;
  gisDetails: string;
  area?: string | null;
  createdById: number;
}

/**
 * Service สำหรับจัดการ PowerOutageRequest database operations
 */
export class PowerOutageRequestService {
  /**
   * ดึงรายการคำขอดับไฟพร้อม pagination และ filters
   */
  static async getPaginatedRequests(
    pagination: PaginationOptions,
    filters?: PowerOutageRequestFilters,
  ): Promise<PaginatedResult<PowerOutageRequestWithRelations>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (filters?.workCenterId) {
      where.workCenterId = filters.workCenterId;
    }
    if (filters?.omsStatus) {
      where.omsStatus = filters.omsStatus;
    }
    if (filters?.statusRequest) {
      where.statusRequest = filters.statusRequest;
    }
    if (filters?.startDate || filters?.endDate) {
      where.outageDate = {};
      if (filters.startDate) {
        where.outageDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.outageDate.lte = filters.endDate;
      }
    }

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      prisma.powerOutageRequest.findMany({
        where,
        include: {
          createdBy: { select: { fullName: true } },
          workCenter: { select: { name: true, id: true } },
          branch: { select: { shortName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.powerOutageRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * ดึงรายการคำขอดับไฟทั้งหมด (สำหรับ backward compatibility)
   */
  static async getAllRequests(): Promise<PowerOutageRequestWithRelations[]> {
    const result = await this.getPaginatedRequests({ page: 1, limit: 1000 });
    return result.data;
  }

  /**
   * ดึงคำขอดับไฟตาม ID
   */
  static async getRequestById(
    id: number,
  ): Promise<PowerOutageRequestWithRelations | null> {
    return await prisma.powerOutageRequest.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        workCenter: { select: { name: true, id: true } },
        branch: { select: { shortName: true } },
      },
    });
  }

  /**
   * สร้างคำขอดับไฟใหม่
   */
  static async createRequest(
    data: CreatePowerOutageRequestData,
  ): Promise<PowerOutageRequest> {
    return await prisma.powerOutageRequest.create({
      data: {
        ...data,
        omsStatus: "NOT_ADDED",
        statusRequest: "NOT",
      },
    });
  }

  /**
   * สร้างคำขอดับไฟหลายรายการพร้อมกัน
   */
  static async createMultipleRequests(
    dataList: CreatePowerOutageRequestData[],
  ): Promise<PowerOutageRequest[]> {
    const requests = dataList.map((data) => ({
      ...data,
      omsStatus: "NOT_ADDED" as const,
      statusRequest: "NOT" as const,
    }));

    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const data of requests) {
        const result = await tx.powerOutageRequest.create({ data });
        results.push(result);
      }
      return results;
    });
  }

  /**
   * อัปเดตคำขอดับไฟ
   */
  static async updateRequest(
    id: number,
    data: Partial<Pick<PowerOutageRequest, "startTime" | "endTime" | "area">>,
  ): Promise<PowerOutageRequest> {
    return await prisma.powerOutageRequest.update({
      where: { id },
      data,
    });
  }

  /**
   * อัปเดตสถานะ OMS
   */
  static async updateOMSStatus(
    id: number,
    omsStatus: OMSStatus,
    updatedById: number,
  ): Promise<PowerOutageRequest> {
    return await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        omsStatus,
        omsUpdatedAt: new Date(),
        omsUpdatedById: updatedById,
      },
    });
  }

  /**
   * อัปเดตสถานะคำขอ
   */
  static async updateRequestStatus(
    id: number,
    statusRequest: Request,
    updatedById: number,
  ): Promise<PowerOutageRequest> {
    return await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        statusRequest,
        statusUpdatedAt: new Date(),
        statusUpdatedById: updatedById,
      },
    });
  }

  /**
   * ลบคำขอดับไฟ
   */
  static async deleteRequest(id: number): Promise<void> {
    await prisma.powerOutageRequest.delete({
      where: { id },
    });
  }

  /**
   * ตรวจสอบการขาดแคลนทรัพยากร (Business Logic)
   */
  static validateOutageDate(outageDate: Date): {
    isValid: boolean;
    error?: string;
  } {
    const today = getThailandDateAtMidnight();
    const diffTime = outageDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 10) {
      return {
        isValid: false,
        error:
          "ไม่สามารถสร้างคำขอดับไฟได้ เนื่องจากวันที่ดับไฟต้องมากกว่า 10 วันจากวันปัจจุบัน",
      };
    }

    return { isValid: true };
  }

  /**
   * คำนวณสีพื้นหลังตามวันที่และสถานะ (UI Logic) - รักษาเงื่อนไขเดิม
   */
  static getRowBackgroundColor(
    omsStatus: string,
    statusRequest: string,
    outageDate: Date,
  ): string {
    const today = getThailandDateAtMidnight();
    const diffTime = outageDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Completed and confirmed requests - keep original gray
    if (omsStatus === "PROCESSED" && statusRequest === "CONFIRM") {
      return "bg-gray-100";
    }

    // Active requests with time-based urgency - keep original colors
    if (statusRequest !== "CANCELLED") {
      // Critical - 5 days or less (Red)
      if (diffDays <= 5 && diffDays >= 0) return "bg-red-50 border-red-200";
      // Warning - 6-7 days (Yellow)
      if (diffDays <= 7 && diffDays > 0)
        return "bg-yellow-50 border-yellow-200";
      // Normal - 8-15 days (Green)
      if (diffDays <= 15 && diffDays > 0) return "bg-green-50 border-green-200";
    }

    // Default
    return "";
  }

  /**
   * คำนวณสีของ badge สำหรับสถานะ
   */
  static getStatusBadgeColor(status: string, type: "oms" | "request"): string {
    if (type === "oms") {
      switch (status) {
        case "NOT_ADDED":
          return "bg-gray-100 text-gray-700 border border-gray-300";
        case "PROCESSED":
          return "bg-pea-100 text-pea-800 border border-pea-300";
        case "CANCELLED":
          return "bg-red-100 text-red-700 border border-red-300";
        default:
          return "bg-gray-100 text-gray-700 border border-gray-300";
      }
    } else {
      switch (status) {
        case "NOT":
          return "bg-amber-100 text-amber-800 border border-amber-300";
        case "CONFIRM":
          return "bg-emerald-100 text-emerald-800 border border-emerald-300";
        case "CANCELLED":
          return "bg-red-100 text-red-700 border border-red-300";
        default:
          return "bg-gray-100 text-gray-700 border border-gray-300";
      }
    }
  }

  /**
   * เรียงลำดับข้อมูลตามเงื่อนไขที่ซับซ้อน (Business Logic)
   */
  static sortRequests(
    data: PowerOutageRequestWithRelations[],
  ): PowerOutageRequestWithRelations[] {
    const today = getThailandDateAtMidnight();

    return data.sort((a, b) => {
      const aOutageDate = new Date(a.outageDate);
      const bOutageDate = new Date(b.outageDate);

      // ตรวจสอบสถานะ PROCESSED และ CONFIRM
      const aIsProcessedAndConfirm =
        a.omsStatus === "PROCESSED" && a.statusRequest === "CONFIRM";
      const bIsProcessedAndConfirm =
        b.omsStatus === "PROCESSED" && b.statusRequest === "CONFIRM";

      // ถ้าทั้งคู่เป็น PROCESSED และ CONFIRM ให้เรียงตาม createdAt
      if (aIsProcessedAndConfirm && bIsProcessedAndConfirm) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      // ถ้าอันใดอันหนึ่งเป็น PROCESSED และ CONFIRM ให้ไว้ท้ายสุด
      if (aIsProcessedAndConfirm) return 1;
      if (bIsProcessedAndConfirm) return -1;

      // เรียง CONFIRM ก่อน (ยกเว้น PROCESSED)
      if (a.statusRequest === "CONFIRM" && b.statusRequest !== "CONFIRM")
        return -1;
      if (a.statusRequest !== "CONFIRM" && b.statusRequest === "CONFIRM")
        return 1;

      // ถ้าทั้งคู่เป็น CONFIRM
      if (a.statusRequest === "CONFIRM" && b.statusRequest === "CONFIRM") {
        // ถ้าทั้งคู่ยังไม่ถึงวันที่ outageDate
        if (aOutageDate >= today && bOutageDate >= today) {
          // เรียงตามวันที่ก่อน
          const dateDiff = aOutageDate.getTime() - bOutageDate.getTime();
          if (dateDiff !== 0) return dateDiff; // เรียงจากใกล้ไปไกล

          // ถ้าวันที่เท่ากัน ให้เรียงตามเวลา startTime
          return a.startTime.getTime() - b.startTime.getTime();
        }
        // ถ้าทั้งคู่ผ่านวันที่ outageDate ไปแล้ว
        if (aOutageDate < today && bOutageDate < today) {
          // เรียงตามวันที่ก่อน
          const dateDiff = bOutageDate.getTime() - aOutageDate.getTime();
          if (dateDiff !== 0) return dateDiff; // เรียงจากไกลไปใกล้

          // ถ้าวันที่เท่ากัน ให้เรียงตามเวลา startTime
          return b.startTime.getTime() - a.startTime.getTime();
        }
        // ถ้าอันหนึ่งยังไม่ถึง และอีกอันผ่านไปแล้ว
        return aOutageDate >= today ? -1 : 1; // อันที่ยังไม่ถึงอยู่ก่อน
      }

      // สำหรับรายการที่ไม่ใช่ CONFIRM - เรียงตาม createdAt เหมือนเดิม
      return b.createdAt.getTime() - a.createdAt.getTime(); // เรียงตาม createdAt จากใหม่ไปเก่า
    });
  }
}
