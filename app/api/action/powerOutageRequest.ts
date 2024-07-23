"use server";

import prisma from "@/lib/prisma";
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// ฟังก์ชันสำหรับ getCurrentUser 
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized: No session found");
  }

  const employeeId = session.user.employeeId;
  const user = await prisma.user.findUnique({
    where: { employeeId: employeeId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function createPowerOutageRequest(data: PowerOutageRequestInput) {
  const currentUser = await getCurrentUser();

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
    return results;
  } catch (error) {
    console.error("Error searching transformers:", error);
    throw error;
  }
}

export async function getPowerOutageRequests() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized: No session found");
  }

  const { role, workCenterId } = session.user;

  let whereCondition = {};

  if (role !== "ADMIN") {
    whereCondition = { workCenterId: Number(workCenterId) };
  }

  try {
    const data = await prisma.powerOutageRequest.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { fullName: true } },
        workCenter: { select: { name: true ,id:true } },
        branch: { select: { shortName: true } },
      },
    });

    return data;
  } catch (error) {
    console.error("Failed to fetch power outage requests:", error);
    throw new Error("Failed to fetch power outage requests");
  }
}

export async function deletePowerOutageRequest(id: number) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized: No session found");
  }

  try {
    await prisma.powerOutageRequest.delete({
      where: { id },
    });
    return { success: true, message: "คำขอถูกลบเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("Error deleting power outage request:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบคำขอ" };
  }
}

export async function updatePowerOutageRequest(id: number, data: PowerOutageRequestInput) {
  const currentUser = await getCurrentUser();

  try {
    const existingRequest = await prisma.powerOutageRequest.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!existingRequest) {
      throw new Error("Power outage request not found");
    }

    if (existingRequest.createdById !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new Error("You don't have permission to update this request");
    }

    const validatedData = PowerOutageRequestSchema.pick({
      startTime: true,
      endTime: true,
      area: true,
    }).parse(data);

    const result = await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        startTime: new Date(`${existingRequest.outageDate.toISOString().split('T')[0]}T${validatedData.startTime}`),
        endTime: new Date(`${existingRequest.outageDate.toISOString().split('T')[0]}T${validatedData.endTime}`),
        area: validatedData.area,
      },
      include: {
        createdBy: { select: { fullName: true } },
        workCenter: { select: { name: true } },
        branch: { select: { shortName: true } },
      },
    });

    return { 
      success: true, 
      data: {
        ...result,
        outageDate: result.outageDate.toISOString(),
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        createdAt: result.createdAt.toISOString(),
        statusUpdatedAt: result.statusUpdatedAt ? result.statusUpdatedAt.toISOString() : null,
      }
    };
  } catch (error) {
    console.error("Failed to update power outage request:", error);
    return { success: false, error: "Failed to update power outage request" };
  }
}