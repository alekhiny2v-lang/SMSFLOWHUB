import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    let query = db.select().from(countries).orderBy(desc(countries.sortOrder), desc(countries.createdAt));
    if (active !== null) {
      query = query.where(eq(countries.active, active === "true")) as typeof query;
    }

    const rows = await query;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const {
      name,
      code,
      smsbowerCountryId,
      providerIds,
      markupPercent = 0,
      sellingPkrPrice,
      active = true,
      sortOrder = 0,
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code required" }, { status: 400 });
    }

    const existing = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Country code already exists" }, { status: 409 });
    }

    const rows = await db
      .insert(countries)
      .values({
        name: String(name).trim(),
        code: String(code).trim().toLowerCase(),
        smsbowerCountryId: smsbowerCountryId ? Number(smsbowerCountryId) : null,
        providerIds: providerIds ? String(providerIds) : "",
        markupPercent: String(markupPercent),
        sellingPkrPrice: sellingPkrPrice ? String(Number(sellingPkrPrice).toFixed(4)) : null,
        active: Boolean(active),
        sortOrder: Number(sortOrder),
      })
      .returning();

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
