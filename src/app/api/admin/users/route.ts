import { NextRequest, NextResponse } from "next/server";
import { eq, like, desc } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    let query = db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    if (q) {
      query = query.where(like(users.username, `%${q}%`)) as typeof query;
    }

    const rows = await query;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { username, password, role = "client", balance = 0, status = "active" } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const rows = await db
      .insert(users)
      .values({
        username: String(username).trim(),
        password: hashed,
        role: role === "admin" ? "admin" : "client",
        balance: String(balance),
        status,
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
        status: users.status,
        createdAt: users.createdAt,
      });

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
