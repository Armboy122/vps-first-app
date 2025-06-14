import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log("API Route: /api/work-centers called");
    
    const workCenters = await prisma.workCenter.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log("Found work centers in API route:", workCenters);

    return NextResponse.json(workCenters);
  } catch (error) {
    console.error("Error in /api/work-centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch work centers" },
      { status: 500 }
    );
  }
} 