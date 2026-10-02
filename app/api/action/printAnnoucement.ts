"use server";

import { GetAnnoucementRequestInput } from "@/lib/validations/powerOutageRequest";
import { getCurrentActor, AccessError } from "@/lib/server/auth/currentActor";
import { canReadWorkCenter } from "@/lib/modules/outages/domain/authorization";
import prisma from "@/lib/prisma";

export async function getDataforPrintAnnouncement(
  input: GetAnnoucementRequestInput,
) {
  try {
    const actor = await getCurrentActor();
    if (!canReadWorkCenter(actor, Number(input.workCenterId))) throw new AccessError("FORBIDDEN", "ไม่มีสิทธิ์อ่านจุดรวมงานนี้");
    const data = await prisma.powerOutageRequest.findMany({
      where: {
        workCenterId: Number(input.workCenterId),
        branchId: Number(input.branchId),
        outageDate: new Date(input.outageDate),
      },
      select: {
        endTime: true,
        startTime: true,
        branch: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
        outageDate: true,
        area: true,
        gisDetails: true,
        transformerNumber: true,
      },
    });
    return data;
  } catch (e) {
    return [];
  }
}
