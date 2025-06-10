'use server'

import prisma from '@/lib/prisma'
import { getThailandDateAtMidnight, getDaysDifference, isDateInFuture } from '@/lib/date-utils'
import { cacheOMSStatusByWorkCenter, cacheOMSStatusDistribution, clearOMSCache } from '@/lib/cache-utils'

/**
 * ดึงข้อมูลการกระจายสถานะ OMS ตามศูนย์งาน พร้อมกับแคชข้อมูลไว้
 * @returns ข้อมูลการกระจายสถานะ OMS ตามศูนย์งาน
 */
export const getOMSStatusDistributionByWorkCenter = cacheOMSStatusDistribution(async () => {
  const today = getThailandDateAtMidnight();
  
  const workCenters = await prisma.workCenter.findMany({
    include: {
      powerOutageRequests: {
        select: {
          omsStatus: true,
          outageDate: true,
          statusRequest: true
        }
      }
    }
  });

  const result = workCenters.map(wc => {
    // กรองเฉพาะรายการที่ statusRequest = CONFIRM และ omsStatus = NOT_ADDED
    const pendingRequests = wc.powerOutageRequests.filter(
      r => r.statusRequest === 'CONFIRM' && r.omsStatus === 'NOT_ADDED'
    );
    
    // ฟังก์ชันสำหรับคำนวณความแตกต่างของวันและจัดกลุ่มตามช่วงเวลา
    const getRequestsInDateRange = (
      minDays: number | null, 
      maxDays: number | null
    ): number => {
      return pendingRequests.filter(r => {
        const outageDate = new Date(r.outageDate);
        const diffDays = getDaysDifference(outageDate, today);
        
        if (minDays !== null && maxDays !== null) {
          return diffDays >= minDays && diffDays <= maxDays;
        } else if (minDays !== null) {
          return diffDays >= minDays;
        } else if (maxDays !== null) {
          return diffDays <= maxDays;
        }
        return false;
      }).length;
    };

    return {
      workCenterId: wc.id,
      workCenterName: wc.name,
      PROCESSED_OVER_15_DAYS: getRequestsInDateRange(16, null),
      PROCESSED_8_TO_15_DAYS: getRequestsInDateRange(8, 15),
      PROCESSED_6_TO_7_DAYS: getRequestsInDateRange(6, 7),
      PROCESSED_1_TO_5_DAYS: getRequestsInDateRange(1, 5),
      PROCESSED_OVERDUE: getRequestsInDateRange(null, 0)
    };
  });

  return result;
});

/**
 * ดึงข้อมูลสถานะ OMS ตามศูนย์งาน พร้อมกับแคชข้อมูลไว้
 * @returns ข้อมูลสถานะ OMS ตามศูนย์งาน
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
        }
      }
    }
  });

  // สร้างวันที่ปัจจุบันในไทม์โซน UTC+7
  const today = getThailandDateAtMidnight();

  return omsStatusByWorkCenter.map(wc => {
    // กรองเฉพาะรายการที่ statusRequest === 'CONFIRM'
    const confirmedRequests = wc.powerOutageRequests.filter(r => r.statusRequest === 'CONFIRM');
    
    // กรองเฉพาะ NOT_ADDED ที่ยังไม่เลยวันที่ปัจจุบัน
    const pendingNotAdded = confirmedRequests.filter(r => {
      const outageDate = new Date(r.outageDate);
      return r.omsStatus === 'NOT_ADDED' && isDateInFuture(outageDate);
    });
    
    return {
      name: wc.name,
      NOT_ADDED: pendingNotAdded.length,
      PROCESSED: confirmedRequests.filter(r => r.omsStatus === 'PROCESSED').length,
      CANCELLED: confirmedRequests.filter(r => r.omsStatus === 'CANCELLED').length,
      outages: confirmedRequests.map(r => ({
        outageDate: r.outageDate,
        omsStatus: r.omsStatus
      }))
    };
  });
});

/**
 * ล้างแคชข้อมูล OMS
 */
export async function invalidateOMSCache() {
  clearOMSCache();
}

