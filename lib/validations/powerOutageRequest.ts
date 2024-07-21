// lib/validations/powerOutageRequest.ts

import { z } from 'zod'

export const PowerOutageRequestSchema = z.object({
  outageDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  workCenterId: z.string(),
  branchId: z.string(),
  transformerNumber: z.string().min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
  gisDetails: z.string(),
  area: z.string().optional(),
});

export type PowerOutageRequestInput = z.infer<typeof PowerOutageRequestSchema>

export const GetAnnoucementRequest = z.object({
  workCenterId: z.string(),
  branchId: z.string(),
  outageDate: z.string()
}).refine((data)=>{
  return data.outageDate != ''
},{
  message: "โปรดระบุวันที่ดับไฟ",
  path: ["outageDate"],
}).refine((data)=>{
  return data.branchId != ''
},{
  message: "โปรดเลือกการไฟฟ้า",
  path: ["branchId"],
}).refine((data)=>{
  return data.workCenterId != ''
},{
  message: "โปรดเลือกการไฟฟ้า",
  path: ["workCenterId"],
})

export type GetAnnoucementRequestInput = z.infer<typeof GetAnnoucementRequest>
