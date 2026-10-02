"use server";
import { getCurrentActor, AccessError } from "@/lib/server/auth/currentActor";
import { canReadWorkCenter } from "@/lib/modules/outages/domain/authorization";
import prisma from "../../../lib/prisma";

export async function getWorkCenters() {
  try {
    const actor = await getCurrentActor();
    const workCenters = await prisma.workCenter.findMany({
      where: actor.role === "ADMIN" || actor.role === "VIEWER" ? {} : { id: actor.workCenterId },
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
    throw new Error("Failed to fetch work centers");
  }
}

export async function getBranches(workCenterId: number) {
  try {
    const actor = await getCurrentActor();
    if (!canReadWorkCenter(actor, workCenterId)) throw new AccessError("FORBIDDEN", "ไม่มีสิทธิ์อ่านจุดรวมงานนี้");
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
