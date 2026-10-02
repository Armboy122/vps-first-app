import { NextResponse } from "next/server";
import { getWorkCenters } from "@/app/api/action/getWorkCentersAndBranches";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workCenters = await getWorkCenters();

    return NextResponse.json(workCenters);
  } catch (error) {
    console.error("Error in /api/work-centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch work centers" },
      { status: 500 },
    );
  }
}
