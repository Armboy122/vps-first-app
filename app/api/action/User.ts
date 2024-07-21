'use server'

import { CreateUserInput, CreateUserSchema } from '@/lib/validations/user';
import prisma from '../../../lib/prisma'
import { hash } from 'bcryptjs'


export async function createUser(input: CreateUserInput) {
  try {
    // Validate input
    const validatedData = await CreateUserSchema.parseAsync(input);

    // ตรวจสอบว่า employeeId นี้มีอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findUnique({ where: { employeeId: validatedData.employeeId } });
    if (existingUser) {
      return { success: false, error: 'This Employee ID is already in use' };
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        password: hashedPassword,
        fullName: validatedData.fullName,
        employeeId: validatedData.employeeId,
        workCenter: { connect: { id: validatedData.workCenterId } },
        branch: { connect: { id: validatedData.branchId } },
        role: validatedData.role,
        status: validatedData.status,
        permissions: validatedData.permissions ? {
          connect: validatedData.permissions.map(id => ({ id }))
        } : undefined,
      },
    })

    return { success: true, user: { ...user, password: undefined } }
  } catch (error) {
    console.error('Failed to create user:', error)
    return { success: false, error: 'Failed to create user. Please try again.' }
  }
}

