"use server";

import prisma from "@/lib/prisma"; // สมมติว่าคุณมี Prisma client setup แล้ว
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// ฟังก์ชันสำหรับ getCurrentUser 
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const employeeId = session?.user.employeeId;
  const user = await prisma.user.findUnique({
    where: { employeeId: employeeId },
  });

  if (!user) {
    throw new Error("Mock user not found");
  }

  return user;
}

export async function createPowerOutageRequest(data: PowerOutageRequestInput) {
  const currentUser = await getCurrentUser();

  // console.log("usercurren",currentUser.id)

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
  // console.log("Searching for:", searchTerm);
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
    // console.log("Search results:", results);
    return results;
  } catch (error) {
    console.error("Error searching transformers:", error);
    throw error;
  }
}

export async function getPowerOutageRequests() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const { role, workCenterId } = session.user;

  let whereCondition = {};

  if (role !== "ADMIN") {
    whereCondition = { workCenterId: Number(workCenterId) };
  }

  const data = await prisma.powerOutageRequest.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { fullName: true } },
      workCenter: { select: { name: true } },
      branch: { select: { shortName: true } },
    },
  });

  return data;
}

export async function deletePowerOutageRequest(id: number) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  // TODO: เพิ่มเงื่อนไขการลบตามสิทธิ์ของผู้ใช้ในอนาคต

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

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

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

    const validatedData = PowerOutageRequestSchema.parse(data);

    const result = await prisma.powerOutageRequest.update({
      where: { id },
      data: {
        ...validatedData,
        outageDate: new Date(validatedData.outageDate),
        startTime: new Date(`${validatedData.outageDate}T${validatedData.startTime}`),
        endTime: new Date(`${validatedData.outageDate}T${validatedData.endTime}`),
        workCenterId: Number(validatedData.workCenterId),
        branchId: Number(validatedData.branchId),
        area: validatedData.area || null,
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
