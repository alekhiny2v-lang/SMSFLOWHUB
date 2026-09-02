import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
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
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { password, currentPassword } = body;

    if (password) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required" }, { status: 400 });
      }
      const hashed = await hashPassword(password);
      await db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, user.id));
    }

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
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
