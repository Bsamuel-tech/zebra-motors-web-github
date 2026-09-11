import { NextResponse } from "next/server";
import { getCustomerAuthRecordByEmail, getCustomerById } from "@/lib/db/customers";
import { verifyPassword } from "@/lib/auth/password";
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/customerSession";

export async function POST(request) {
  // See the identical check in app/api/customer-auth/signup/route.js: without
  // it, a missing JWT_SECRET crashes createCustomerSessionToken with an
  // opaque, bodyless 500 instead of a real, diagnosable error.
  if (!process.env.JWT_SECRET) {
    console.error("Customer login failed: JWT_SECRET is not set in this environment.");
    return NextResponse.json(
      { error: "Sign-in is not available right now (server configuration issue). Contact Zebra Motors directly." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const record = await getCustomerAuthRecordByEmail(email);
  if (!record || !record.password_hash) {
    // Deliberately the same message whether the email is unknown or has no
    // password set yet (e.g. it only exists as a booking Zebra staff
    // entered by phone), so this never reveals which emails exist in the
    // system.
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, record.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await createCustomerSessionToken({
    customerId: record.id,
    email: record.email,
    name: record.name,
  });

  const customer = await getCustomerById(record.id);
  const response = NextResponse.json({ customer });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, CUSTOMER_SESSION_COOKIE_OPTIONS);
  return response;
}
