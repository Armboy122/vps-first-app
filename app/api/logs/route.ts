import { getCurrentActor } from "@/lib/server/auth/currentActor";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint สำหรับรับ log entries จาก frontend
 * ในการใช้งานจริงอาจส่งไปยัง logging service เช่น CloudWatch, DataDog, หรือ Sentry
 */
export async function POST(request: NextRequest) {
  try {
    await getCurrentActor();
    if (Number(request.headers.get("content-length") || 0) > 65536) return NextResponse.json({ success: false }, { status: 413 });
    const logEntry = await request.json();

    // ใน development ให้ log ไปยัง console
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Frontend Log:", JSON.stringify(logEntry, null, 2));
    }

    // ใน production ควรส่งไปยัง logging service
    if (process.env.NODE_ENV === "production") {
      // ตัวอย่าง: ส่งไปยัง external logging service
      // await sendToLoggingService(logEntry);
      // หรือบันทึกลง database
      // await saveLogToDatabase(logEntry);
      // หรือส่งไปยัง file system
      // await appendToLogFile(logEntry);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing log entry:", error);
    // ไม่ควร return error เพราะจะทำให้ frontend application หยุดทำงาน
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

/**
 * ฟังก์ชันตัวอย่างสำหรับส่งไปยัง external logging service
 */
// async function sendToLoggingService(logEntry: any) {
//   // ตัวอย่างการส่งไปยัง webhook หรือ API
//   const response = await fetch(process.env.LOGGING_SERVICE_URL!, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${process.env.LOGGING_SERVICE_TOKEN}`
//     },
//     body: JSON.stringify(logEntry)
//   });
//
//   if (!response.ok) {
//     console.error('Failed to send log to external service:', response.statusText);
//   }
// }
