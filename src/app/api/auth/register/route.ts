import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, confirmPassword } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, cleanUsername));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const rows = await db
      .insert(users)
      .values({
        username: cleanUsername,
        password: hashed,
        role: "client",
        balance: "0",
        status: "active",
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
      });

    const user = rows[0];
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
