import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "alive",
    version: process.env.APP_VERSION ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
