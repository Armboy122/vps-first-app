import { z } from 'zod'

export const CreateUserSchema = z.object({
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร").max(100, "ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร"),
  employeeId: z.string()
    .min(6, "รหัสพนักงานต้องมีอย่างน้อย 6 ตัวอักษร")
    .max(10, "รหัสพนักงานต้องไม่เกิน 10 ตัวอักษร")
    .regex(/^[a-zA-Z0-9]+$/, "รหัสพนักงานใช้ได้เฉพาะตัวอักษรและตัวเลข"),
  workCenterId: z.number().int().positive("กรุณาเลือกจุดรวมงาน"),
  branchId: z.number().int().positive("กรุณาเลือกสาขา"),
  role: z.enum(['VIEWER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'USER'], {
    errorMap: () => ({ message: "กรุณาเลือกบทบาท" })
  }),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>