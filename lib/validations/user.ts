import { z } from 'zod'

export const CreateUserSchema = z.object({
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  employeeId: z.string().regex(/^\d{6}$/, "Employee ID must be exactly 6 digits"),
  workCenterId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'USER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  permissions: z.array(z.number().int().positive()).optional(),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>