import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/requireCustomer";
import { getCustomerById } from "@/lib/db/customers";

// Used by client components (the header, the login page after a successful
// signup/signin) that need to know who is signed in without a full page
// reload. Server components use getCustomerSession() directly instead.
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ customer: null });
  }
  const customer = await getCustomerById(session.customerId);
  return NextResponse.json({ customer });
}
