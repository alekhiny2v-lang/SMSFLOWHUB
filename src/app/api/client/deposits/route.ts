import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { amount, method = "manual", reference = "", notes = "" } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const rows = await db
      .insert(transactions)
      .values({
        userId: user.id,
        type: "deposit_request",
        amount: String(Number(amount).toFixed(4)),
        status: "pending",
        method: String(method),
        reference: String(reference),
        notes: String(notes),
      })
      .returning();

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
