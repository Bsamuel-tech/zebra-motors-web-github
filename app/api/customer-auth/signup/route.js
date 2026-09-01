import { NextResponse } from "next/server";
import { createCustomerAccount } from "@/lib/db/customers";
import { hashPassword } from "@/lib/auth/password";
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/customerSession";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const phone = body?.phone?.trim() || null;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  let customer;
  try {
    customer = await createCustomerAccount({ name, email, phone, passwordHash });
  } catch (error) {
    if (error.code === "ACCOUNT_EXISTS") {
      return NextResponse.json(
        { error: "An account already exists for this email. Sign in instead." },
        { status: 409 }
      );
    }
    throw error;
  }

  const token = await createCustomerSessionToken({
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
  });

  const response = NextResponse.json({ customer });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, CUSTOMER_SESSION_COOKIE_OPTIONS);
  return response;
}
