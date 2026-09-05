import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession, normalizeUsername } from "@/lib/auth";
import { ensureAdmin, ADMIN_USERNAME } from "@/lib/bootstrap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const cleanUsername = normalizeUsername(username);

    const loadUser = () =>
      db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          balance: users.balance,
          password: users.password,
          status: users.status,
        })
        .from(users)
        .where(eq(users.username, cleanUsername));

    let rows = await loadUser();

    // Lazily bootstrap the admin account so the default admin credentials work
    // out of the box, even if `/api/setup` or the seed script was never run.
    // This runs only when the lookup came back empty (one round trip) — doing it
    // up front cost a second connection attempt on every login, which pushed the
    // request past the 10s serverless execution limit whenever the database was
    // slow or unreachable.
    if (rows.length === 0 && cleanUsername === ADMIN_USERNAME) {
      try {
        await ensureAdmin();
        rows = await loadUser();
      } catch (bootstrapErr) {
        console.error("[v0] Admin bootstrap during login failed:", (bootstrapErr as Error).message);
      }
    }

    const user = rows[0];
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(String(password), user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession({
      id: user.id,
      username: user.username,
      role: user.role as "admin" | "client",
      balance: String(user.balance),
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      balance: user.balance,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
