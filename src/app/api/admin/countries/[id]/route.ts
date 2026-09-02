import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const rows = await db.select().from(countries).where(eq(countries.id, Number(id)));
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      code,
      smsbowerCountryId,
      providerIds,
      markupPercent,
      sellingPkrPrice,
      active,
      sortOrder,
    } = body;

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) values.name = String(name).trim();
    if (code !== undefined) values.code = String(code).trim().toLowerCase();
    if (smsbowerCountryId !== undefined) values.smsbowerCountryId = smsbowerCountryId ? Number(smsbowerCountryId) : null;
    if (providerIds !== undefined) values.providerIds = String(providerIds);
    if (markupPercent !== undefined) values.markupPercent = String(markupPercent);
    if (sellingPkrPrice !== undefined) values.sellingPkrPrice = sellingPkrPrice ? String(Number(sellingPkrPrice).toFixed(4)) : null;
    if (active !== undefined) values.active = Boolean(active);
    if (sortOrder !== undefined) values.sortOrder = Number(sortOrder);

    const rows = await db
      .update(countries)
      .set(values)
      .where(eq(countries.id, Number(id)))
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
    await db.delete(countries).where(eq(countries.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
