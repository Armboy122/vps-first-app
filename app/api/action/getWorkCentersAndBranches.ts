"use server";
import prisma from "../../../lib/prisma";

export async function getWorkCenters() {
  try {
    const workCenters = await prisma.workCenter.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Serialize ข้อมูลให้แน่ใจว่าส่งผ่าน network ได้
    const result = workCenters.map((center) => ({
      id: Number(center.id),
      name: String(center.name),
    }));
    
    return result;
  } catch (error) {
    console.error("❌ Error in getWorkCenters server action:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    
    throw new Error(`Failed to fetch work centers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getBranches(workCenterId: number) {
  try {
    const branches = await prisma.branch.findMany({
      where: { workCenterId: workCenterId },
      select: { id: true, shortName: true, workCenterId: true },
    });
    return branches;
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    throw new Error("Failed to fetch branches");
  }
}
