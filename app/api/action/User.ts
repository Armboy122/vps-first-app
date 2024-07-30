"use server";

import { CreateUserInput, CreateUserSchema } from "@/lib/validations/user";
import prisma, { Role } from "../../../lib/prisma";
import { hash } from "bcryptjs";

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