// Server-only. Reads and verifies the customer session cookie inside a
// route handler or server component, the same pattern lib/auth/requireAdmin.js
// uses for admin sessions. Returns the session payload or null, callers
// decide what to do (redirect, 401, etc.).
import { cookies } from "next/headers";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "./customerSession";

export async function getCustomerSession() {
  const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value;
  return verifyCustomerSessionToken(token);
}
