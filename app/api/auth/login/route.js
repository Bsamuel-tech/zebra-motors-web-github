import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { logAction } from "@/lib/db/auditLog";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await logAction({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
