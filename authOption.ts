import prisma from './lib/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        employeeId: { label: 'รหัสพนักงาน', type: 'text' },
        password: { label: 'รหัสผ่าน', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) {
          throw new Error('กรุณากรอกรหัสพนักงานและรหัสผ่าน')
        }

        const user = await prisma.user.findUnique({
          where: { employeeId: credentials.employeeId },
          include: { workCenter: true, branch: true }
        })

        if (!user) {
          throw new Error('ไม่พบผู้ใช้งาน')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง')
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
        token.id = user.id
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
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.employeeId = token.employeeId as string
        session.user.workCenterId = token.workCenterId as number
        session.user.branchId = token.branchId as number
        session.user.workCenterName = token.workCenterName as string
        session.user.branchName = token.branchName as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)