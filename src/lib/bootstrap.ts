import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

/**
 * Admin credentials used by the single bootstrap path.
 * Both the `scripts/seed.ts` script and the `/api/setup` endpoint read from
 * here, so they can never drift apart again. Overridable via env vars.
 */
export const ADMIN_USERNAME: string = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
export const ADMIN_PASSWORD: string = process.env.ADMIN_PASSWORD || "admin123";

export interface BootstrapResult {
  username: string;
  created: boolean;
}

/**
 * Single source of truth for bootstrapping the initial admin user.
 *
 * The check is keyed on the admin username rather than on whether the users
 * collection is empty: if a user with ADMIN_USERNAME already exists the
 * bootstrap is a no-op, otherwise the admin is created. This makes the
 * operation idempotent and safe to call from both the setup endpoint and the
 * seed script, and it still creates the admin when other (client) users
 * already exist in the collection.
 */
export async function ensureAdmin(): Promise<BootstrapResult> {
  const username = ADMIN_USERNAME;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));

  if (existing.length > 0) {
    return { username, created: false };
  }

  const hashed = await hashPassword(ADMIN_PASSWORD);
  await db.insert(users).values({
    username,
    password: hashed,
    role: "admin",
    balance: "0",
    status: "active",
  });

  return { username, created: true };
}
