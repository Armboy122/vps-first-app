"use server";

import { getCurrentActor } from "@/lib/server/auth/currentActor";

interface PdfData {
  peaNo: string;
  name: string;
  cutoffDate: string;
  annouceDate: string;
  tel: string;
}

export async function generatePdf(data: PdfData) {
  try {
    await getCurrentActor();
    if (process.env.APP_ENV === "preview" || process.env.VERCEL_ENV === "preview") return { success: false, data: null, message: "การสร้าง PDF ภายนอกปิดใช้งานในระบบทดสอบ" };
    const response = await fetch(
      process.env.NEXT_PUBLIC_GENERATE_PDF as string,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result.data,
      message: result.msg,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      data: null,
      message:
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้าง PDF",
    };
  }
}
