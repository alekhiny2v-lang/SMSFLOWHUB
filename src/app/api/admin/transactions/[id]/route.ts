import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "completed" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const rows = await db.select().from(transactions).where(eq(transactions.id, Number(id)));
    const txRow = rows[0];
    if (!txRow) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (txRow.status !== "pending") {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ status, updatedAt: new Date() })
        .where(eq(transactions.id, Number(id)));

      if (status === "completed" && (txRow.type === "deposit_request" || txRow.type === "admin_credit")) {
        const userRows = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, txRow.userId));
        const newBalance = Number(userRows[0]?.balance || 0) + Number(txRow.amount);
        await tx
          .update(users)
          .set({ balance: String(newBalance.toFixed(4)), updatedAt: new Date() })
          .where(eq(users.id, txRow.userId));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
