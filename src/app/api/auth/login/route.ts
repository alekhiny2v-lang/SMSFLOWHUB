import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        balance: users.balance,
        password: users.password,
        status: users.status,
      })
      .from(users)
      .where(eq(users.username, String(username).trim()));

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
