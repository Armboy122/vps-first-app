import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from '@/lib/prisma'
import { compare } from 'bcryptjs'
import { Role } from "@prisma/client"

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        employeeId: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) {
          throw new Error("Missing employeeId or password")
        }

        const user = await prisma.user.findUnique({
          where: { employeeId: credentials.employeeId },
          include: { workCenter : true , branch :true}
        })

        if (!user) {
          throw new Error("User not found")
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid password")
        }

        return {
          id: user.id.toString(),
          employeeId: user.employeeId,
          name: user.fullName,
          role: user.role,
          workCenterId: user.workCenterId,
          branchId: user.branchId,
          workCenterName: user.workCenter.name,
          branchName: user.branch.shortName
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.employeeId = user.employeeId
        token.workCenterId = user.workCenterId
        token.branchId = user.branchId
        token.workCenterName = user.workCenterName
        token.branchName = user.branchName

      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as Role
        session.user.employeeId = token.employeeId as string
        session.user.workCenterId = token.workCenterId as number
        session.user.branchId = token.branchId as number
        session.user.workCenterName = token.workCenterName as string
        session.user.branchName = token.branchName as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }