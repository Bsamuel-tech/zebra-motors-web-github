import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customerSession";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
