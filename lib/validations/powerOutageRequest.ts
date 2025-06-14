// lib/validations/powerOutageRequest.ts

import { z } from "zod";

export const PowerOutageRequestSchema = z
  .object({
    outageDate: z.string().min(1, "กรุณาระบุวันที่ดับไฟ"),
    startTime: z
      .string()
      .min(1, "กรุณาระบุเวลาเริ่มต้น")
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "รูปแบบเวลาไม่ถูกต้อง"),
    endTime: z
      .string()
      .min(1, "กรุณาระบุเวลาสิ้นสุด")
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "รูปแบบเวลาไม่ถูกต้อง"),
    workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงาน"),
    branchId: z.string().min(1, "กรุณาเลือกสาขา"),
    transformerNumber: z.string().min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
    gisDetails: z.string(),
    area: z.string().nullable(),
  })
  .refine(
    (data) => {
      // ตรวจสอบเวลาทำการ (06:00 - 20:00)
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);

      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      // เวลาทำการ 06:00 - 20:00
      const workingStart = 6 * 60; // 06:00
      const workingEnd = 20 * 60; // 20:00

      return (
        startTimeInMinutes >= workingStart && endTimeInMinutes <= workingEnd
      );
    },
    {
      message: "เวลาต้องอยู่ในช่วงเวลาทำการ 06:00 - 20:00 น.",
      path: ["startTime"],
    },
  )
  .refine(
    (data) => {
      // ตรวจสอบว่าเวลาสิ้นสุดมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);

      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      return endTimeInMinutes > startTimeInMinutes + 29; // อย่างน้อย 30 นาที
    },
    {
      message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที",
      path: ["endTime"],
    },
  );

// Schema สำหรับการ update (ไม่มี refine เพื่อให้ใช้ pick ได้)
export const PowerOutageRequestUpdateSchema = z.object({
  outageDate: z.string().min(1, "กรุณาระบุวันที่ดับไฟ"),
  startTime: z.string().min(1, "กรุณาระบุเวลาเริ่มต้น"),
  endTime: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
  workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงาน"),
  branchId: z.string().min(1, "กรุณาเลือกสาขา"),
  transformerNumber: z.string().min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
  gisDetails: z.string(),
  area: z.string().nullable(),
});

export type PowerOutageRequestInput = z.infer<typeof PowerOutageRequestSchema>;

export const GetAnnoucementRequest = z
  .object({
    workCenterId: z.string(),
    branchId: z.string(),
    outageDate: z.string(),
  })
  .refine(
    (data) => {
      return data.outageDate != "";
    },
    {
      message: "โปรดระบุวันที่ดับไฟ",
      path: ["outageDate"],
    },
  )
  .refine(
    (data) => {
      return data.branchId != "";
    },
    {
      message: "โปรดเลือกการไฟฟ้า",
      path: ["branchId"],
    },
  )
  .refine(
    (data) => {
      return data.workCenterId != "";
    },
    {
      message: "โปรดเลือกการไฟฟ้า",
      path: ["workCenterId"],
    },
  );

export type GetAnnoucementRequestInput = z.infer<typeof GetAnnoucementRequest>;
