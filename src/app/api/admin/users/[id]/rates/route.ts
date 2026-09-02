import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "@/db/query";
import { db } from "@/db";
import { userCountryRates, countries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = Number(id);

    const [rateRows, countryRows] = await Promise.all([
      db
        .select({
          id: userCountryRates.id,
          countryId: userCountryRates.countryId,
          pkrPrice: userCountryRates.pkrPrice,
          countryName: countries.name,
          countryCode: countries.code,
        })
        .from(userCountryRates)
        .leftJoin(countries, eq(userCountryRates.countryId, countries.id))
        .where(eq(userCountryRates.userId, userId)),
      db.select().from(countries).where(eq(countries.active, true)).orderBy(countries.sortOrder, countries.name),
    ]);

    const ratesMap = new Map(rateRows.map((r) => [r.countryId, r]));

    const result = countryRows.map((c) => ({
      countryId: c.id,
      countryName: c.name,
      countryCode: c.code,
      defaultPkrPrice: null as number | null,
      customPkrPrice: ratesMap.has(c.id) ? Number(ratesMap.get(c.id)!.pkrPrice) : null,
      rateId: ratesMap.get(c.id)?.id || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const body = await req.json();
    const { countryId, pkrPrice } = body;

    if (!countryId || pkrPrice === undefined || pkrPrice === "" || Number(pkrPrice) < 0) {
      return NextResponse.json({ error: "Country and valid price required" }, { status: 400 });
    }

    const existing = await db
      .select({ id: userCountryRates.id })
      .from(userCountryRates)
      .where(and(eq(userCountryRates.userId, userId), eq(userCountryRates.countryId, Number(countryId))));

    if (existing.length > 0) {
      await db
        .update(userCountryRates)
        .set({ pkrPrice: String(Number(pkrPrice).toFixed(4)), updatedAt: new Date() })
        .where(eq(userCountryRates.id, existing[0].id));
    } else {
      await db.insert(userCountryRates).values({
        userId,
        countryId: Number(countryId),
        pkrPrice: String(Number(pkrPrice).toFixed(4)),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
