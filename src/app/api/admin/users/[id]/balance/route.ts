import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const body = await req.json();
    const { amount, type, notes = "" } = body;

    if (!amount || (type !== "add" && type !== "deduct")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    if (!userRows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = Number(userRows[0].balance);
    const newBalance = type === "add" ? currentBalance + numericAmount : currentBalance - numericAmount;

    if (newBalance < 0) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: String(newBalance.toFixed(4)), updatedAt: new Date() })
        .where(eq(users.id, userId));

      await tx.insert(transactions).values({
        userId,
        type: type === "add" ? "admin_credit" : "admin_debit",
        amount: String(numericAmount.toFixed(4)),
        status: "completed",
        method: "manual",
        notes: notes || `Balance ${type} by admin`,
        createdById: admin.id,
      });
    });

    return NextResponse.json({ success: true, newBalance: newBalance.toFixed(4) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
