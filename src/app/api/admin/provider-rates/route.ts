import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "@/db/query";
import { db } from "@/db";
import { countries, countryProviderRates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/**
 * Per-provider rate cards.
 *
 * Every provider id on a country can carry its own profit / selling price, so
 * the same country can be sold at different rates depending on which provider
 * actually serves the number.
 *
 *   GET  /api/admin/provider-rates?countryId=12
 *   POST /api/admin/provider-rates   { countryId, rates: [{ providerId, profitPkr?, pkrPrice?, stock?, usdPrice?, active? }] }
 *   DELETE /api/admin/provider-rates?countryId=12   (clears the country's cards)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const countryId = Number(searchParams.get("countryId") || "");
    if (!Number.isFinite(countryId)) {
      return NextResponse.json({ error: "countryId is required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(countryProviderRates)
      .where(eq(countryProviderRates.countryId, countryId));

    return NextResponse.json({
      rates: rows
        .map((row) => ({
          id: row.id,
          countryId: row.countryId,
          providerId: Number(row.providerId),
          service: row.service || "fb",
          usdPrice: row.usdPrice ? Number(row.usdPrice) : null,
          stock: Number(row.stock ?? 0),
          costPkr: row.costPkr ? Number(row.costPkr) : null,
          profitPkr: row.profitPkr === null || row.profitPkr === undefined ? null : Number(row.profitPkr),
          pkrPrice: row.pkrPrice ? Number(row.pkrPrice) : null,
          active: row.active !== false,
          updatedAt: row.updatedAt,
        }))
        .sort((a, b) => a.providerId - b.providerId),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const countryId = Number(body.countryId);
    const service = body.service || "fb";
    const rates = Array.isArray(body.rates) ? body.rates : [];

    if (!Number.isFinite(countryId)) {
      return NextResponse.json({ error: "countryId is required" }, { status: 400 });
    }

    const countryRows = await db.select().from(countries).where(eq(countries.id, countryId));
    if (!countryRows[0]) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const saved = [];
    for (const rate of rates) {
      const providerId = Number(rate.providerId);
      if (!Number.isFinite(providerId)) continue;

      const values: Record<string, unknown> = {
        countryId,
        providerId,
        service,
        usdPrice: rate.usdPrice === undefined || rate.usdPrice === null || rate.usdPrice === "" ? null : String(Number(rate.usdPrice)),
        stock: rate.stock === undefined || rate.stock === null || rate.stock === "" ? null : String(Number(rate.stock)),
        costPkr: rate.costPkr === undefined || rate.costPkr === null || rate.costPkr === "" ? null : String(Number(rate.costPkr)),
        profitPkr:
          rate.profitPkr === undefined || rate.profitPkr === null || rate.profitPkr === ""
            ? null
            : String(Number(rate.profitPkr)),
        pkrPrice:
          rate.pkrPrice === undefined || rate.pkrPrice === null || rate.pkrPrice === ""
            ? null
            : String(Number(rate.pkrPrice)),
        active: rate.active === undefined ? true : Boolean(rate.active),
        updatedAt: new Date(),
      };

      const existing = await db
        .select({ id: countryProviderRates.id })
        .from(countryProviderRates)
        .where(and(eq(countryProviderRates.countryId, countryId), eq(countryProviderRates.providerId, providerId)));

      if (existing.length) {
        const updated = await db
          .update(countryProviderRates)
          .set(values)
          .where(eq(countryProviderRates.id, existing[0].id))
          .returning();
        saved.push(updated[0]);
      } else {
        const inserted = await db.insert(countryProviderRates).values(values).returning();
        saved.push(inserted[0]);
      }
    }

    return NextResponse.json({ success: true, saved: saved.length, rates: saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const countryId = Number(searchParams.get("countryId") || "");
    if (!Number.isFinite(countryId)) {
      return NextResponse.json({ error: "countryId is required" }, { status: 400 });
    }
    await db.delete(countryProviderRates).where(eq(countryProviderRates.countryId, countryId));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
