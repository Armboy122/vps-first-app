import prisma from "@/lib/prisma";
import { WorkCenter, Branch } from "@prisma/client";

// Types
export interface WorkCenterWithBranches extends WorkCenter {
  branches: Branch[];
}

export interface BranchWithWorkCenter extends Branch {
  workCenter: WorkCenter;
}

/**
 * Service สำหรับจัดการ WorkCenter และ Branch database operations
 */
export class WorkCenterService {
  /**
   * ดึงรายการ WorkCenter ทั้งหมด
   */
  static async getAllWorkCenters(): Promise<WorkCenter[]> {
    return await prisma.workCenter.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * ดึงรายการ WorkCenter พร้อม Branches
   */
  static async getWorkCentersWithBranches(): Promise<WorkCenterWithBranches[]> {
    return await prisma.workCenter.findMany({
      include: {
        branches: {
          orderBy: { shortName: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * ดึง WorkCenter ตาม ID
   */
  static async getWorkCenterById(id: number): Promise<WorkCenter | null> {
    return await prisma.workCenter.findUnique({
      where: { id },
    });
  }

  /**
   * ดึงรายการ Branch ตาม WorkCenter ID
   */
  static async getBranchesByWorkCenterId(
    workCenterId: number,
  ): Promise<Branch[]> {
    return await prisma.branch.findMany({
      where: { workCenterId },
      orderBy: { shortName: "asc" },
    });
  }

  /**
   * ดึงรายการ Branch ทั้งหมด
   */
  static async getAllBranches(): Promise<BranchWithWorkCenter[]> {
    return await prisma.branch.findMany({
      include: {
        workCenter: true,
      },
      orderBy: [{ workCenter: { name: "asc" } }, { shortName: "asc" }],
    });
  }

  /**
   * ดึง Branch ตาม ID
   */
  static async getBranchById(id: number): Promise<Branch | null> {
    return await prisma.branch.findUnique({
      where: { id },
    });
  }

  /**
   * สร้าง WorkCenter ใหม่
   */
  static async createWorkCenter(
    data: Pick<WorkCenter, "name">,
  ): Promise<WorkCenter> {
    return await prisma.workCenter.create({
      data,
    });
  }

  /**
   * สร้าง Branch ใหม่
   */
  static async createBranch(
    data: Pick<
      Branch,
      "workCenterId" | "fullName" | "shortName" | "phoneNumber"
    >,
  ): Promise<Branch> {
    return await prisma.branch.create({
      data,
    });
  }

  /**
   * อัปเดต WorkCenter
   */
  static async updateWorkCenter(
    id: number,
    data: Partial<Pick<WorkCenter, "name">>,
  ): Promise<WorkCenter> {
    return await prisma.workCenter.update({
      where: { id },
      data,
    });
  }

  /**
   * อัปเดต Branch
   */
  static async updateBranch(
    id: number,
    data: Partial<Pick<Branch, "fullName" | "shortName" | "phoneNumber">>,
  ): Promise<Branch> {
    return await prisma.branch.update({
      where: { id },
      data,
    });
  }

  /**
   * ลบ WorkCenter (และ Branches ที่เกี่ยวข้อง)
   */
  static async deleteWorkCenter(id: number): Promise<void> {
    await prisma.workCenter.delete({
      where: { id },
    });
  }

  /**
   * ลบ Branch
   */
  static async deleteBranch(id: number): Promise<void> {
    await prisma.branch.delete({
      where: { id },
    });
  }

  /**
   * ตรวจสอบว่า WorkCenter มีการใช้งานหรือไม่
   */
  static async isWorkCenterInUse(id: number): Promise<boolean> {
    const [branchCount, userCount, requestCount] = await Promise.all([
      prisma.branch.count({ where: { workCenterId: id } }),
      prisma.user.count({ where: { workCenterId: id } }),
      prisma.powerOutageRequest.count({ where: { workCenterId: id } }),
    ]);

    return branchCount > 0 || userCount > 0 || requestCount > 0;
  }

  /**
   * ตรวจสอบว่า Branch มีการใช้งานหรือไม่
   */
  static async isBranchInUse(id: number): Promise<boolean> {
    const [userCount, requestCount] = await Promise.all([
      prisma.user.count({ where: { branchId: id } }),
      prisma.powerOutageRequest.count({ where: { branchId: id } }),
    ]);

    return userCount > 0 || requestCount > 0;
  }
}
