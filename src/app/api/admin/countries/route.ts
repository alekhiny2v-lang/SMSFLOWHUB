import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getCountryCode, getCountryFlag } from "@/lib/country";
import { DEFAULT_PROFIT_PKR, getPricingSettings } from "@/lib/pricing";

/** Flags are resolved from the code (or the name when the code is unknown). */
function withFlag(row: Record<string, any>) {
  const code = getCountryCode(row.code) ?? getCountryCode(row.name);
  return { ...row, resolvedCode: code, flag: getCountryFlag(code ?? row.name) };
}

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
    return NextResponse.json(rows.map(withFlag));
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
      profitPkr,
      sellingPkrPrice,
      active = true,
      sortOrder = 0,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Country name required" }, { status: 400 });
    }

    // Typed "Pakistan" with no code? Derive "pk" and its flag automatically.
    const resolvedCode = (code && String(code).trim()) || getCountryCode(String(name)) || String(name).slice(0, 2);
    const normalisedCode = String(resolvedCode).trim().toLowerCase();

    const existing = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, normalisedCode));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Country code already exists", countryId: existing[0].id }, { status: 409 });
    }

    const { defaultProfitPkr } = await getPricingSettings();
    const profit = profitPkr === undefined || profitPkr === null || profitPkr === "" ? defaultProfitPkr : Number(profitPkr);

    const rows = await db
      .insert(countries)
      .values({
        name: String(name).trim(),
        code: normalisedCode,
        // Country id 0 (Russia) is valid — only blank values become null.
        smsbowerCountryId: smsbowerCountryId === null || smsbowerCountryId === undefined || smsbowerCountryId === ""
          ? null
          : Number(smsbowerCountryId),
        providerIds: providerIds ? String(providerIds) : "",
        markupPercent: String(markupPercent ?? 0),
        profitPkr: String(Number.isFinite(profit) ? profit : DEFAULT_PROFIT_PKR),
        sellingPkrPrice: sellingPkrPrice ? String(Number(sellingPkrPrice).toFixed(4)) : null,
        active: Boolean(active),
        sortOrder: Number(sortOrder),
      })
      .returning();

    return NextResponse.json(withFlag(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
