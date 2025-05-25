// lib/validations/powerOutageRequest.ts

import { z } from 'zod'

export const PowerOutageRequestSchema = z.object({
  outageDate: z.string().min(1, "กรุณาระบุวันที่ดับไฟ"),
  startTime: z.string().min(1, "กรุณาระบุเวลาเริ่มต้น"),
  endTime: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
  workCenterId: z.string().min(1, "กรุณาเลือกศูนย์งาน"),
  branchId: z.string().min(1, "กรุณาเลือกสาขา"),
  transformerNumber: z.string().min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
  gisDetails: z.string(),
  area: z.string().nullable(),
}).refine((data) => {
  // ตรวจสอบว่าเวลาสิ้นสุดมาหลังเวลาเริ่มต้น
  const startTime = new Date(`${data.outageDate}T${data.startTime}`);
  const endTime = new Date(`${data.outageDate}T${data.endTime}`);
  return endTime > startTime;
}, {
  message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
  path: ["endTime"],
});

// Schema สำหรับการ update (ไม่มี refine เพื่อให้ใช้ pick ได้)
export const PowerOutageRequestUpdateSchema = z.object({
  outageDate: z.string().min(1, "กรุณาระบุวันที่ดับไฟ"),
  startTime: z.string().min(1, "กรุณาระบุเวลาเริ่มต้น"),
  endTime: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
  workCenterId: z.string().min(1, "กรุณาเลือกศูนย์งาน"),
  branchId: z.string().min(1, "กรุณาเลือกสาขา"),
  transformerNumber: z.string().min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
  gisDetails: z.string(),
  area: z.string().nullable(),
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
