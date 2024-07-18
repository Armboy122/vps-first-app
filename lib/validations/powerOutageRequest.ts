// lib/validations/powerOutageRequest.ts

import { z } from 'zod'

export const PowerOutageRequestSchema = z.object({
  outageDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  workCenterId: z.string(),
  branchId: z.string(),
  transformerNumber: z.string(),
  gisDetails: z.string(),
  area: z.string().optional()
}).refine((data) => {
  const startDateTime = new Date(`${data.outageDate}T${data.startTime}`);
  const endDateTime = new Date(`${data.outageDate}T${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
  path: ["endTime"], // This will show the error message on the endTime field
});

export type PowerOutageRequestInput = z.infer<typeof PowerOutageRequestSchema>