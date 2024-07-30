import prisma from "@/lib/prisma";
import { Prisma, Request, OMSStatus } from '@prisma/client';

export async function getPowerOutageRequestsSummary() {
  const totalRequests = await prisma.powerOutageRequest.count();
  
  const statusDistribution = await prisma.powerOutageRequest.groupBy({
    by: ['statusRequest'],
    _count: {
      _all: true
    }
  });

  const urgentRequests = await prisma.powerOutageRequest.count({
    where: {
      outageDate: {
        lte: new Date(new Date().setDate(new Date().getDate() + 3))
      },
      statusRequest: 'NOT'
    }
  });

  const dailyTrend = await prisma.powerOutageRequest.groupBy({
    by: ['outageDate'],
    _count: {
      _all: true
    },
    orderBy: {
      outageDate: 'asc'
    },
    take: 7 // Last 7 days
  });

  return {
    totalRequests,
    statusDistribution,
    urgentRequests,
    dailyTrend
  };
}

export async function getOMSStatusSummary() {
  return prisma.powerOutageRequest.groupBy({
    by: ['omsStatus'],
    _count: {
      _all: true
    }
  });
}

export async function getLatestRequests(limit: number = 5) {
  return prisma.powerOutageRequest.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      createdAt: true,
      createdBy: {
        select: {
          fullName: true
        }
      },
      workCenter: {
        select: {
          name: true
        }
      },
      branch: {
        select: {
          shortName: true
        }
      },
      statusRequest: true
    }
  });
}

export async function getRequestsByWorkCenter() {
  return prisma.powerOutageRequest.groupBy({
    by: ['workCenterId'],
    _count: {
      _all: true
    }
  });
}

export async function getAverageApprovalTime() {
  const requests = await prisma.powerOutageRequest.findMany({
    where: {
      statusRequest: 'CONFIRM',
      statusUpdatedAt: {
        not: null
      }
    },
    select: {
      createdAt: true,
      statusUpdatedAt: true
    }
  });

  const totalTime = requests.reduce((acc, req) => {
    return acc + (req.statusUpdatedAt!.getTime() - req.createdAt.getTime());
  }, 0);

  return requests.length > 0 ? totalTime / requests.length / (1000 * 60 * 60) : 0; // Average time in hours
}

export async function getPendingApprovals() {
  return prisma.powerOutageRequest.count({
    where: {
      statusRequest: 'NOT',
      createdAt: {
        lte: new Date(new Date().setDate(new Date().getDate() - 7))
      }
    }
  });
}