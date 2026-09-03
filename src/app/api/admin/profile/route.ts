import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword, verifyPassword, normalizeUsername, refreshSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAdmin();
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id));
    if (!rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireAdmin();
    const body = await req.json();
    const { username, currentPassword, password } = body;

    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Fetch full user record including password hash
    const userRows = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id));
    const dbUser = userRows[0];
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If updating username
    if (username !== undefined && username.trim() !== "") {
      const cleanUsername = normalizeUsername(username);
      if (cleanUsername !== dbUser.username) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, cleanUsername));
        if (existing.length > 0) {
          return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }
        updateData.username = cleanUsername;
      }
    }

    // If updating password
    if (password && password.trim() !== "") {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required to change password" }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword, dbUser.password);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    if (Object.keys(updateData).length > 1) {
      await db.update(users).set(updateData).where(eq(users.id, sessionUser.id));
    }

    // Refresh session in case username changed
    await refreshSessionUser(sessionUser.id);

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id));

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
