// lib/validations/powerOutageRequest.ts

import { z } from "zod";

export const PowerOutageRequestSchema = z
  .object({
    outageDate: z
      .string()
      .min(1, "กรุณาเลือกวันที่ดับไฟ"),
    startTime: z
      .string()
      .min(1, "กรุณาระบุเวลาเริ่มต้น เช่น 08:00")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "รูปแบบเวลาไม่ถูกต้อง กรุณาใส่ในรูปแบบ HH:MM เช่น 08:00",
      ),
    endTime: z
      .string()
      .min(1, "กรุณาระบุเวลาสิ้นสุด เช่น 12:00")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "รูปแบบเวลาไม่ถูกต้อง กรุณาใส่ในรูปแบบ HH:MM เช่น 12:00",
      ),
    workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงาน"),
    branchId: z.string().min(1, "กรุณาเลือกสาขา"),
    transformerNumber: z
      .string()
      .min(1, "กรุณาระบุหมายเลขหม้อแปลง หรือค้นหาจากช่องค้นหาด้านบน"),
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
      message:
        "เวลาต้องอยู่ในช่วงเวลาทำการ 06:00 - 20:00 น. กรุณาตรวจสอบเวลาเริ่มต้นและสิ้นสุดอีกครั้ง",
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
      message:
        "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที เช่น ถ้าเริ่มต้น 08:00 ต้องสิ้นสุดไม่ก่อน 08:30",
      path: ["endTime"],
    },
  );

// Schema สำหรับการ update (ไม่มี refine เพื่อให้ใช้ pick ได้)
export const PowerOutageRequestUpdateSchema = z.object({
  outageDate: z.string().min(1, "กรุณาเลือกวันที่ดับไฟ"),
  startTime: z
    .string()
    .min(1, "กรุณาระบุเวลาเริ่มต้น เช่น 08:00"),
  endTime: z
    .string()
    .min(1, "กรุณาระบุเวลาสิ้นสุด เช่น 12:00"),
  workCenterId: z.string().min(1, "กรุณาเลือกจุดรวมงาน"),
  branchId: z.string().min(1, "กรุณาเลือกสาขา"),
  transformerNumber: z
    .string()
    .min(1, "กรุณาระบุหมายเลขหม้อแปลง"),
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
      message: "กรุณาระบุวันที่ดับไฟ",
      path: ["outageDate"],
    },
  )
  .refine(
    (data) => {
      return data.branchId != "";
    },
    {
      message: "กรุณาเลือกสาขาการไฟฟ้า",
      path: ["branchId"],
    },
  )
  .refine(
    (data) => {
      return data.workCenterId != "";
    },
    {
      message: "กรุณาเลือกจุดรวมงาน",
      path: ["workCenterId"],
    },
  );

export type GetAnnoucementRequestInput = z.infer<typeof GetAnnoucementRequest>;
