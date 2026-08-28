// Server-only. Reads and verifies the admin session cookie inside a route
// handler or server component. Returns the session payload or null, callers
// decide what to do (redirect, 401, etc.), this file makes no HTTP decisions
// itself so it can be reused from both route handlers and page components.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
