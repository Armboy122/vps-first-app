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