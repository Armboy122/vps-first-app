import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ตรวจสอบการเชื่อมต่อ database
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        version: process.env.APP_VERSION ?? "unknown",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          api: "running",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        version: process.env.APP_VERSION ?? "unknown",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
        services: {
          database: "disconnected",
          api: "running",
        },
      },
      { status: 503 },
    );
  }
}
