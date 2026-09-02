import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { paymentMethods } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, user.id))
      .orderBy(paymentMethods.createdAt);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { type, accountName, accountNumber, notes = "", isDefault = false } = body;

    if (!type || !accountName || !accountNumber) {
      return NextResponse.json({ error: "Type, account name and account number required" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(paymentMethods)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(paymentMethods.userId, user.id));
      }

      await tx.insert(paymentMethods).values({
        userId: user.id,
        type: String(type).trim(),
        accountName: String(accountName).trim(),
        accountNumber: String(accountNumber).trim(),
        notes: String(notes).trim(),
        isDefault: Boolean(isDefault),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
