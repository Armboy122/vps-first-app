import prisma from "@/lib/prisma";
import { User, Role, WorkCenter, Branch } from "@prisma/client";

// Types
export interface UserWithRelations extends User {
  workCenter: WorkCenter;
  branch: Branch;
}

export interface CreateUserData {
  password: string;
  fullName: string;
  employeeId: string;
  workCenterId: number;
  branchId: number;
  role: Role;
}

export interface UpdateUserData {
  password?: string;
  fullName?: string;
  workCenterId?: number;
  branchId?: number;
  role?: Role;
}

/**
 * Service สำหรับจัดการ User database operations
 */
export class UserService {
  /**
   * ดึงรายการ User ทั้งหมดพร้อมข้อมูลเกี่ยวข้อง
   */
  static async getAllUsers(): Promise<UserWithRelations[]> {
    return await prisma.user.findMany({
      include: {
        workCenter: true,
        branch: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  /**
   * ดึง User ตาม ID
   */
  static async getUserById(id: number): Promise<UserWithRelations | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        workCenter: true,
        branch: true
      }
    });
  }

  /**
   * ดึง User ตาม employeeId
   */
  static async getUserByEmployeeId(employeeId: string): Promise<UserWithRelations | null> {
    return await prisma.user.findUnique({
      where: { employeeId },
      include: {
        workCenter: true,
        branch: true
      }
    });
  }

  /**
   * สร้าง User ใหม่
   */
  static async createUser(data: CreateUserData): Promise<User> {
    return await prisma.user.create({
      data
    });
  }

  /**
   * อัปเดต User
   */
  static async updateUser(id: number, data: UpdateUserData): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * ลบ User
   */
  static async deleteUser(id: number): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }

  /**
   * ตรวจสอบว่า employeeId มีอยู่แล้วหรือไม่
   */
  static async employeeIdExists(employeeId: string, excludeId?: number): Promise<boolean> {
    const where: any = { employeeId };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.user.count({ where });
    return count > 0;
  }

  /**
   * ดึงรายการ User ตาม WorkCenter
   */
  static async getUsersByWorkCenter(workCenterId: number): Promise<UserWithRelations[]> {
    return await prisma.user.findMany({
      where: { workCenterId },
      include: {
        workCenter: true,
        branch: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  /**
   * ดึงรายการ User ตาม Branch
   */
  static async getUsersByBranch(branchId: number): Promise<UserWithRelations[]> {
    return await prisma.user.findMany({
      where: { branchId },
      include: {
        workCenter: true,
        branch: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  /**
   * ดึงรายการ User ตาม Role
   */
  static async getUsersByRole(role: Role): Promise<UserWithRelations[]> {
    return await prisma.user.findMany({
      where: { role },
      include: {
        workCenter: true,
        branch: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  /**
   * ตรวจสอบสิทธิ์การเข้าถึง
   */
  static canAccessWorkCenter(user: User, targetWorkCenterId: number): boolean {
    // Admin และ Viewer สามารถเข้าถึงทุก WorkCenter
    if (user.role === 'ADMIN' || user.role === 'VIEWER') {
      return true;
    }
    
    // อื่นๆ สามารถเข้าถึงเฉพาะ WorkCenter ของตัวเอง
    return user.workCenterId === targetWorkCenterId;
  }

  /**
   * ตรวจสอบสิทธิ์การแก้ไข
   */
  static canEditRequest(user: User, requestCreatorId: number, requestStatus: string): boolean {
    // Admin สามารถแก้ไขได้ทุกอย่าง
    if (user.role === 'ADMIN') {
      return true;
    }

    // Viewer ไม่สามารถแก้ไขได้
    if (user.role === 'VIEWER') {
      return false;
    }

    // USER สามารถแก้ไขได้เฉพาะของตัวเองและยังไม่ได้รับการอนุมัติ
    if (user.role === 'USER') {
      return user.id === requestCreatorId && requestStatus === 'NOT';
    }

    return false;
  }

  /**
   * ตรวจสอบสิทธิ์การอัปเดต OMS Status
   */
  static canUpdateOMSStatus(user: User): boolean {
    return user.role === 'ADMIN' || user.role === 'SUPERVISOR';
  }

  /**
   * ตรวจสอบสิทธิ์การอัปเดต Request Status
   */
  static canUpdateRequestStatus(user: User): boolean {
    return user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'SUPERVISOR';
  }
}