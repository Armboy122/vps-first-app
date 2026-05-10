"use server";

import prisma from "@/lib/prisma";
import { isDateInFuture } from "@/lib/date-utils";
import {
  cacheOMSStatusByWorkCenter,
  cacheOMSStatusDistribution,
  clearOMSCache,
} from "@/lib/cache-utils";
import { getOmsUrgencyBucketCounts } from "@/lib/utils/status-utils";

/**
 * ดึงข้อมูลการกระจายสถานะ OMS ตามจุดรวมงาน พร้อมกับแคชข้อมูลไว้
 * @returns ข้อมูลการกระจายสถานะ OMS ตามจุดรวมงาน
 */
export const getOMSStatusDistributionByWorkCenter = cacheOMSStatusDistribution(
  async () => {
    const workCenters = await prisma.workCenter.findMany({
      include: {
        powerOutageRequests: {
          select: {
            omsStatus: true,
            outageDate: true,
            statusRequest: true,
          },
        },
      },
    });

    const result = workCenters.map((wc) => {
      const urgencyBuckets = getOmsUrgencyBucketCounts(
        wc.powerOutageRequests,
      );

      return {
        workCenterId: wc.id,
        workCenterName: wc.name,
        PROCESSED_OVER_15_BUSINESS_DAYS:
          urgencyBuckets.OVER_15_BUSINESS_DAYS,
        PROCESSED_8_TO_15_BUSINESS_DAYS:
          urgencyBuckets.BUSINESS_DAYS_8_TO_15,
        PROCESSED_4_TO_7_BUSINESS_DAYS:
          urgencyBuckets.BUSINESS_DAYS_4_TO_7,
        PROCESSED_WITHIN_3_BUSINESS_DAYS:
          urgencyBuckets.WITHIN_3_BUSINESS_DAYS,
        PROCESSED_OVERDUE: urgencyBuckets.OVERDUE,
      };
    });

    return result;
  },
);

/**
 * ดึงข้อมูลสถานะ OMS ตามจุดรวมงาน พร้อมกับแคชข้อมูลไว้
 * @returns ข้อมูลสถานะ OMS ตามจุดรวมงาน
 */
export const getOMSStatusByWorkCenter = cacheOMSStatusByWorkCenter(async () => {
  const omsStatusByWorkCenter = await prisma.workCenter.findMany({
    select: {
      name: true,
      powerOutageRequests: {
        select: {
          omsStatus: true,
          outageDate: true,
          statusRequest: true,
        },
      },
    },
  });

  return omsStatusByWorkCenter.map((wc) => {
    // กรองเฉพาะรายการที่ statusRequest === 'CONFIRM'
    const confirmedRequests = wc.powerOutageRequests.filter(
      (r) => r.statusRequest === "CONFIRM",
    );

    // กรองเฉพาะ NOT_ADDED ที่ยังไม่เลยวันที่ปัจจุบัน
    const pendingNotAdded = confirmedRequests.filter((r) => {
      const outageDate = new Date(r.outageDate);
      return r.omsStatus === "NOT_ADDED" && isDateInFuture(outageDate);
    });

    return {
      name: wc.name,
      NOT_ADDED: pendingNotAdded.length,
      PROCESSED: confirmedRequests.filter((r) => r.omsStatus === "PROCESSED")
        .length,
      CANCELLED: confirmedRequests.filter((r) => r.omsStatus === "CANCELLED")
        .length,
      outages: confirmedRequests.map((r) => ({
        outageDate: r.outageDate,
        omsStatus: r.omsStatus,
      })),
    };
  });
});

/**
 * ล้างแคชข้อมูล OMS
 */
export async function invalidateOMSCache() {
  clearOMSCache();
}
