import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // ตรวจสอบทุกหน้า ยกเว้นหน้าที่ระบุ
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
