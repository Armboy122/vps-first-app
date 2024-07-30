import prisma from "@/lib/prisma";
import { Prisma, Request, OMSStatus } from '@prisma/client';
import { getServerSession } from "next-auth";

import { NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';
import { authOptions } from "@/authOption";


interface ExtendedSession extends Session {
  user: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    role: string;
    workCenterId: number;
    branchId: number;
    workCenterName: string;
    branchName: string;
  };
}

export async function getPowerOutageRequestsSummary() {
  const session = await getServerSession(authOptions) as ExtendedSession;

  const { role, workCenterId } = session.user;

  const isAdminOrViewer = role === 'admin' || role === 'VIEWER';

  const totalRequests = isAdminOrViewer
    ? await prisma.powerOutageRequest.count()
    : await prisma.powerOutageRequest.count({
        where: {
          workCenterId: workCenterId
        }
      });
  
  const statusDistribution = isAdminOrViewer
    ? await prisma.powerOutageRequest.groupBy({
        by: ['statusRequest'],
        _count: {
          _all: true
        }
      })
    : await prisma.powerOutageRequest.groupBy({
        by: ['statusRequest'],
        _count: {
          _all: true
        },
        where: {
          workCenterId: workCenterId
        }
      });

  const threeRequests = isAdminOrViewer
    ? await prisma.powerOutageRequest.count({
        where: {
          outageDate: {
            lte: new Date(new Date().setDate(new Date().getDate() + 3))
          },
          statusRequest: 'NOT'
        }
      })
    : await prisma.powerOutageRequest.count({
        where: {
          outageDate: {
            lte: new Date(new Date().setDate(new Date().getDate() + 3))
          },
          statusRequest: 'NOT',
          workCenterId: workCenterId
        }
      });

  const sevenRequests = isAdminOrViewer
    ? await prisma.powerOutageRequest.count({
        where: {
          outageDate: {
            lte: new Date(new Date().setDate(new Date().getDate() + 7))
          },
          statusRequest: 'NOT'
        }
      })
    : await prisma.powerOutageRequest.count({
        where: {
          outageDate: {
            lte: new Date(new Date().setDate(new Date().getDate() + 7))
          },
          statusRequest: 'NOT',
          workCenterId: workCenterId
        }
      });

  const dailyTrend = isAdminOrViewer
    ? await prisma.powerOutageRequest.groupBy({
        by: ['outageDate'],
        _count: {
          _all: true
        },
        orderBy: {
          outageDate: 'asc'
        },
        take: 7 // Last 7 days
      })
    : await prisma.powerOutageRequest.groupBy({
        by: ['outageDate'],
        _count: {
          _all: true
        },
        where: {
          workCenterId: workCenterId
        },
        orderBy: {
          outageDate: 'asc'
        },
        take: 7 // Last 7 days
      });

  return {
    totalRequests,
    statusDistribution,
    threeRequests,
    sevenRequests,
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

export async function getRequestsByWorkCenter() {
  return prisma.powerOutageRequest.groupBy({
    by: ['workCenterId'],
    _count: {
      _all: true
    }
  });
}