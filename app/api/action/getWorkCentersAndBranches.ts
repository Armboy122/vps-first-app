'use server'
import prisma from '../../../lib/prisma'

export async function getWorkCenters() {
    try {
      const workCenters = await prisma.workCenter.findMany()
      return workCenters
    } catch (error) {
      console.error('มีปัญหาการดึงข้อมูลจุดรวมงาน:', error)
      throw new Error('Failed to fetch work centers')
    }
  }
  
  export async function getBranches(workCenterId: number) {
    try {
      const branches = await prisma.branch.findMany({
        where: { workCenterId: workCenterId },
        select: { id: true, shortName: true, workCenterId: true }
      })
      return branches
    } catch (error) {
      console.error('Failed to fetch branches:', error)
      throw new Error('Failed to fetch branches')
    }
  }


  