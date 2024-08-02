'use server'

import prisma from '@/lib/prisma'
import { OMSStatus, Request } from '@prisma/client'

export async function getWorkCenterRequests() {
  const workCenterRequests = await prisma.workCenter.findMany({
    select: {
      name: true,
      _count: {
        select: { powerOutageRequests: true }
      }
    }
  });

  return workCenterRequests;
}

export async function getRequestStatusDistribution() {
  const statusDistribution = await prisma.powerOutageRequest.groupBy({
    by: ['statusRequest'],
    _count: true
  });

  return statusDistribution as { statusRequest: Request; _count: number }[];
}

export async function getRequestsOverTime(interval: 'daily' | 'weekly' | 'monthly') {
  const now = new Date()
  let startDate: Date

  switch (interval) {
    case 'daily':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 วันย้อนหลัง
      break
    case 'weekly':
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000) // 12 สัปดาห์ย้อนหลัง
      break
    case 'monthly':
      startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000) // 12 เดือนย้อนหลัง
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const requests = await prisma.powerOutageRequest.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const groupedRequests = requests.reduce((acc, request) => {
    let key: string
    const date = new Date(request.createdAt)

    switch (interval) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekNumber = Math.ceil((date.getDate() - date.getDay() + 1) / 7)
        key = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
        break
      case 'monthly':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!acc[key]) {
      acc[key] = 0
    }
    acc[key]++
    return acc
  }, {} as Record<string, number>)

  return Object.entries(groupedRequests).map(([date, count]) => ({ date, count }))
}

export async function getOMSStatusByWorkCenter() {
  const omsStatusByWorkCenter = await prisma.workCenter.findMany({
    select: {
      name: true,
      powerOutageRequests: {
        select: {
          omsStatus: true
        }
      }
    }
  });

  return omsStatusByWorkCenter.map(wc => ({
    name: wc.name,
    NOT_ADDED: wc.powerOutageRequests.filter(r => r.omsStatus === 'NOT_ADDED').length,
    PROCESSED: wc.powerOutageRequests.filter(r => r.omsStatus === 'PROCESSED').length,
    CANCELLED: wc.powerOutageRequests.filter(r => r.omsStatus === 'CANCELLED').length
  }));
}

export async function getOutageTimeHeatmap() {
  const outageData = await prisma.powerOutageRequest.findMany({
    select: {
      startTime: true,
      endTime: true
    }
  });

  const heatmapData: number[][] = Array(24).fill(0).map(() => Array(7).fill(0));

  outageData.forEach(outage => {
    const start = new Date(outage.startTime);
    const end = new Date(outage.endTime);
    const day = start.getDay();
    
    for (let hour = start.getHours(); hour <= end.getHours(); hour++) {
      heatmapData[hour][day]++;
    }
  });

  return heatmapData;
}