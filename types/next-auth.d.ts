import NextAuth, { DefaultUser, DefaultSession } from "next-auth"
import { User as PrismaUser, Role } from "@prisma/client"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      employeeId: string
      name: string
      email: string
      role: string
      workCenterId: number
      branchId: number
      workCenterName: string
      branchName: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    employeeId: string
    role: string
    workCenterId: number
    branchId: number
    workCenterName: string
    branchName: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    employeeId?: string
    workCenterId?: number
    branchId?: number
    workCenterName?: string
    branchName?: string
  }
}