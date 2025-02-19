'use server'

import prisma from '@/lib/prisma'

export async function getOMSStatusDistributionByWorkCenter() {
  const today = new Date();
  
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
    // กรองเฉพาะรายการที่ statusRequest = CONFIRM และ omsStatus = PROCESSED
    const processedRequests = wc.powerOutageRequests.filter(
      r => r.statusRequest === 'CONFIRM' && r.omsStatus === 'NOT_ADDED'
    );
    
    // แบ่งตามช่วงเวลา
    const PROCESSED_OVER_15_DAYS = processedRequests.filter(r => {
      const diffDays = Math.ceil(
        (new Date(r.outageDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays > 15;
    }).length;
    
    const PROCESSED_8_TO_15_DAYS = processedRequests.filter(r => {
      const diffDays = Math.ceil(
        (new Date(r.outageDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays > 7 && diffDays <= 15;
    }).length;
    
    const PROCESSED_6_TO_7_DAYS = processedRequests.filter(r => {
      const diffDays = Math.ceil(
        (new Date(r.outageDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays > 5 && diffDays <= 7;
    }).length;
    
    const PROCESSED_1_TO_5_DAYS = processedRequests.filter(r => {
      const diffDays = Math.ceil(
        (new Date(r.outageDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays >= 1 && diffDays <= 5;
    }).length;
    
    const PROCESSED_OVERDUE = processedRequests.filter(r => {
      const diffDays = Math.ceil(
        (new Date(r.outageDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays <= 0;
    }).length;

    return {
      workCenterId: wc.id,
      workCenterName: wc.name,
      PROCESSED_OVER_15_DAYS,
      PROCESSED_8_TO_15_DAYS,
      PROCESSED_6_TO_7_DAYS,
      PROCESSED_1_TO_5_DAYS,
      PROCESSED_OVERDUE
    };
  });
  console.log(result);
  return result;
}


export async function getOMSStatusByWorkCenter() {
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

  return omsStatusByWorkCenter.map(wc => {
    // กรองเฉพาะรายการที่ statusRequest === 'CONFIRM'
    const confirmedRequests = wc.powerOutageRequests.filter(r => r.statusRequest === 'CONFIRM');
    
    return {
      name: wc.name,
      NOT_ADDED: confirmedRequests.filter(r => r.omsStatus === 'NOT_ADDED').length,
      PROCESSED: confirmedRequests.filter(r => r.omsStatus === 'PROCESSED').length,
      CANCELLED: confirmedRequests.filter(r => r.omsStatus === 'CANCELLED').length,
      outages: confirmedRequests.map(r => ({
        outageDate: r.outageDate,
        omsStatus: r.omsStatus
      }))
    };
  });
}

