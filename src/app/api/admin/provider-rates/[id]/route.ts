import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { countryProviderRates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/** Edit or drop a single provider rate card. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (body.profitPkr !== undefined)
      values.profitPkr = body.profitPkr === null || body.profitPkr === "" ? null : String(Number(body.profitPkr));
    if (body.pkrPrice !== undefined)
      values.pkrPrice = body.pkrPrice === null || body.pkrPrice === "" ? null : String(Number(body.pkrPrice));
    if (body.stock !== undefined) values.stock = body.stock === null ? null : String(Number(body.stock));
    if (body.usdPrice !== undefined) values.usdPrice = body.usdPrice === null ? null : String(Number(body.usdPrice));
    if (body.active !== undefined) values.active = Boolean(body.active);

    const rows = await db
      .update(countryProviderRates)
      .set(values)
      .where(eq(countryProviderRates.id, Number(id)))
      .returning();

    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.delete(countryProviderRates).where(eq(countryProviderRates.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
