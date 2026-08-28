// Session cookie, signed with jose (works in both the Node route handler
// runtime and the Edge runtime middleware.js runs in). Never expose
// JWT_SECRET to the client, it is only read here, server-side.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "zebra_admin_session";
const SESSION_DAYS = 7;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add it to .env before using admin authentication."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken({ userId, email, name, role }) {
  return new SignJWT({ email, name, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

// Returns the decoded session payload, or null if the token is missing,
// expired, or invalid. Never throws, callers just check for null.
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
