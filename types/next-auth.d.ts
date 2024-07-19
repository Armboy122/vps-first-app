///<reference types="@prisma/client" />
import NextAuth from "next-auth"
import { User } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      employeeId: string
      name: string
      role: User['role']
      email: string
    }
  }
}