// Protects every /admin/* route except the login page itself, and every
// /account/* route (real customer accounts, Section 7/8). Runs in the Edge
// runtime, so it only verifies the JWT signature with jose, it never
// touches node:sqlite or Postgres (only available in the Node.js runtime,
// not the edge). The two sections use completely separate session cookies
// (lib/auth/session.js for admin, lib/auth/customerSession.js for
// customers), so an admin and a customer can be signed in on the same
// browser at once without either one interfering with the other.
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth/customerSession";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
    const session = await verifyCustomerSessionToken(token);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
