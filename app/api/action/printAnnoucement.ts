'use server'

import { GetAnnoucementRequestInput } from "@/lib/validations/powerOutageRequest";
import prisma from '@/lib/prisma'

export async function getDataforPrintAnnouncement(input: GetAnnoucementRequestInput) {
    try {
        const data = await prisma.powerOutageRequest.findMany({
            where: {
                workCenterId: Number(input.workCenterId),
                branchId: Number(input.branchId),
                outageDate: new Date(input.outageDate)
            },
            select: {
                endTime: true,
                startTime: true,
                branch: {
                    select: {
                        fullName: true,
                        phoneNumber: true
                    }
                },
                outageDate: true,
                area: true,
                gisDetails: true
            }
        })
        return data
    } catch(e) {
        return []
    }
    
}