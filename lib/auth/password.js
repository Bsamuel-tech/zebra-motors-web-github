// Server-only (Node runtime route handlers and scripts). bcryptjs is pure
// JavaScript, no native binary, so it needed no special handling in this
// sandbox the way better-sqlite3 and Prisma did.
import bcrypt from "bcryptjs";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
