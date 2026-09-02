import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "@/db/query";
import { db } from "@/db";
import { paymentMethods } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await db
      .delete(paymentMethods)
      .where(and(eq(paymentMethods.id, Number(id)), eq(paymentMethods.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { isDefault } = body;

    await db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(paymentMethods)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(paymentMethods.userId, user.id));
      }
      await tx
        .update(paymentMethods)
        .set({ isDefault: Boolean(isDefault), updatedAt: new Date() })
        .where(and(eq(paymentMethods.id, Number(id)), eq(paymentMethods.userId, user.id)));
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
