import { z } from 'zod'

export const CreateUserSchema = z.object({
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  employeeId: z.string().regex(/^\d{6}(\*)?$/, "รหัสพนักงานต้องเป็นตัวเลข 6 หลัก หรือตามด้วยเครื่องหมาย *"),
  workCenterId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  role: z.enum(['VIEWER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'USER']),
  })

export type CreateUserInput = z.infer<typeof CreateUserSchema>