"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma"; // สมมติว่าคุณมี Prisma client setup แล้ว
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// ฟังก์ชัน mock สำหรับ getCurrentUser (ยังคงเหมือนเดิม)
async function getCurrentUser() {
  const mockUser = await prisma.user.findUnique({
    where: { employeeId: "507765" },
  });

  if (!mockUser) {
    throw new Error("Mock user not found");
  }

  return mockUser;
}

export async function createPowerOutageRequest(data: PowerOutageRequestInput) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    const validatedData = PowerOutageRequestSchema.parse(data);

    const result = await prisma.powerOutageRequest.create({
      data: {
        ...validatedData,
        outageDate: new Date(validatedData.outageDate),
        startTime: new Date(
          `${validatedData.outageDate}T${validatedData.startTime}`
        ),
        endTime: new Date(
          `${validatedData.outageDate}T${validatedData.endTime}`
        ),
        workCenterId: Number(validatedData.workCenterId),
        branchId: Number(validatedData.branchId),
        createdById: currentUser.id,
        omsStatus: "NOT_ADDED",
      },
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create power outage request:", error);
    return { success: false, error: "Failed to create power outage request" };
  }
}

// ฟังก์ชันสำหรับค้นหา Transformer
export async function searchTransformers(searchTerm: string) {
  console.log("Searching for:", searchTerm);
  try {
    const results = await prisma.transformer.findMany({
      where: {
        OR: [
          { transformerNumber: { contains: searchTerm, mode: "insensitive" } },
          { gisDetails: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
    console.log("Search results:", results);
    return results;
  } catch (error) {
    console.error("Error searching transformers:", error);
    throw error;
  }
}

export async function getPowerOutageRequests() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }

  const { role, workCenterId } = session.user

  let whereCondition = {}
  
  if (role !== 'ADMIN') {
    whereCondition = { workCenterId: Number(workCenterId) }
  }

  const data = await prisma.powerOutageRequest.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { fullName: true } },
      workCenter: { select: { name: true } },
      branch: { select: { shortName: true } },
    },
  })

  return data
}
