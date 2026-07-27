import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workCenters = await prisma.workCenter.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(workCenters);
  } catch (error) {
    console.error("Error in /api/work-centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch work centers" },
      { status: 500 },
    );
  }
}
