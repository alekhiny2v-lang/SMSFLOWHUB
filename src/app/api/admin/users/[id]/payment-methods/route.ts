import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { paymentMethods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, Number(id)))
      .orderBy(paymentMethods.isDefault, paymentMethods.createdAt);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
