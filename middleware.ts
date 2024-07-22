import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // If the user is trying to access an admin page and is not an admin, redirect to home page
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If the user is not logged in, redirect to the login page
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };