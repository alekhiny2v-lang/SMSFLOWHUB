import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { depositAccounts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { type, accountName, accountNumber, instructions, active, sortOrder } = body;

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (type !== undefined) values.type = String(type).trim();
    if (accountName !== undefined) values.accountName = String(accountName).trim();
    if (accountNumber !== undefined) values.accountNumber = String(accountNumber).trim();
    if (instructions !== undefined) values.instructions = String(instructions).trim();
    if (active !== undefined) values.active = Boolean(active);
    if (sortOrder !== undefined) values.sortOrder = Number(sortOrder);

    const rows = await db
      .update(depositAccounts)
      .set(values)
      .where(eq(depositAccounts.id, Number(id)))
      .returning();

    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.delete(depositAccounts).where(eq(depositAccounts.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
