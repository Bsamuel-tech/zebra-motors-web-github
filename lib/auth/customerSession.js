// Customer-facing session, completely separate from the admin session in
// lib/auth/session.js (different cookie, so a customer and an admin can be
// signed in on the same browser at once without clobbering each other, and
// so nothing about admin auth had to change to add this). Same mechanism
// (a jose-signed JWT) and same JWT_SECRET, since both are just proving "this
// browser was issued a token for this account" and there is no reason to
// manage two separate secrets for that.
import { SignJWT, jwtVerify } from "jose";

export const CUSTOMER_SESSION_COOKIE = "zebra_customer_session";
const SESSION_DAYS = 30;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add it to .env before using customer authentication."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createCustomerSessionToken({ customerId, email, name }) {
  return new SignJWT({ email, name, kind: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

// Returns the decoded session payload, or null if the token is missing,
// expired, invalid, or (defense in depth) turns out to be an admin token
// presented here by mistake. Never throws, callers just check for null.
export async function verifyCustomerSessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.kind !== "customer") return null;
    return {
      customerId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export const CUSTOMER_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
