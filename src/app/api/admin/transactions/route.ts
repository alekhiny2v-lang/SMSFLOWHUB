import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        username: users.username,
        type: transactions.type,
        amount: transactions.amount,
        status: transactions.status,
        method: transactions.method,
        reference: transactions.reference,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt));

    if (userId) {
      query = query.where(eq(transactions.userId, Number(userId))) as typeof query;
    }
    if (status) {
      query = query.where(eq(transactions.status, status)) as typeof query;
    }

    const rows = await query;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { userId, amount, type, status = "completed", method = "manual", reference = "", notes = "" } = body;

    if (!userId || !amount || !type) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const rows = await db
      .insert(transactions)
      .values({
        userId: Number(userId),
        type: String(type),
        amount: String(Number(amount).toFixed(4)),
        status: String(status),
        method: String(method),
        reference: String(reference),
        notes: String(notes),
        createdById: admin.id,
      })
      .returning();

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
