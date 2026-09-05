import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";

const COOKIE_NAME = "panel_session";
const DEV_FALLBACK_SECRET = "dev-only-secret";

/**
 * Resolve the signing secret lazily, at the moment a token is signed or
 * verified, instead of while the module is being imported.
 *
 * Reading `process.env.JWT_SECRET` at module scope meant the whole app threw
 * during `next build` (and on every cold start) whenever the variable was
 * missing from the deployment environment — the build aborted with
 * "JWT_SECRET is required in production" and every route served a 500. Deferring
 * the check keeps the build green and turns a missing secret into an explicit,
 * actionable error on the one request that actually needs it.
 */
function getSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not configured. Add it to your deployment environment variables and redeploy.");
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(jwtSecret);
}

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "client";
  balance: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Single normalization rule for usernames: trim whitespace and lowercase so
 * registration, login and the admin bootstrap all store/look up the same key.
 */
export function normalizeUsername(username: string): string {
  return String(username).trim().toLowerCase();
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function refreshSessionUser(userId: number): Promise<SessionUser> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      balance: users.balance,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!rows[0]) throw new Error("User not found");
  const user = rows[0] as SessionUser;
  await createSession(user);
  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  try {
    return await refreshSessionUser(sessionUser.id);
  } catch {
    await destroySession();
    return null;
  }
}
