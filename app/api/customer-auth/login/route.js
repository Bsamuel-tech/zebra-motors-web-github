import { NextResponse } from "next/server";
import { getCustomerAuthRecordByEmail, getCustomerById } from "@/lib/db/customers";
import { verifyPassword } from "@/lib/auth/password";
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/customerSession";

export async function POST(request) {
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
