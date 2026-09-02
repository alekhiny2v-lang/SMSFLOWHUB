import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "@/db/query";
import { db } from "@/db";
import { users, countries, activations, transactions, userCountryRates } from "@/db/schema";
import { requireAuth, refreshSessionUser } from "@/lib/auth";
import { getNumberV2, getPricesV3 } from "@/lib/smsbower";

const USD_TO_PKR = 280;
const SERVICE = "fb";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { countryId } = body;

    if (!countryId) {
      return NextResponse.json({ error: "Country required" }, { status: 400 });
    }

    const countryRows = await db.select().from(countries).where(eq(countries.id, Number(countryId)));
    const country = countryRows[0];
    if (!country || !country.active || !country.smsbowerCountryId) {
      return NextResponse.json({ error: "Invalid country" }, { status: 400 });
    }

    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, user.id));
    const balance = Number(userRows[0]?.balance || 0);

    // Priority 1: User-specific custom rate
    const customRateRows = await db
      .select({ pkrPrice: userCountryRates.pkrPrice })
      .from(userCountryRates)
      .where(and(eq(userCountryRates.userId, user.id), eq(userCountryRates.countryId, country.id)));

    let pkrPrice: number;
    if (customRateRows.length > 0) {
      pkrPrice = Number(Number(customRateRows[0].pkrPrice).toFixed(2));
    } else if (country.sellingPkrPrice) {
      // Priority 2: Country fixed selling price
      pkrPrice = Number(Number(country.sellingPkrPrice).toFixed(2));
    } else {
      // Priority 3: Default markup-based price
      const prices = await getPricesV3(SERVICE);
      const countryKey = String(country.smsbowerCountryId);
      const serviceData = prices?.[countryKey]?.[SERVICE];
      if (!serviceData) {
        return NextResponse.json({ error: "Price not available" }, { status: 400 });
      }

      const entries = Object.values(serviceData) as Array<{ provider_id: number; count: number; price: number }>;
      if (!entries.length) {
        return NextResponse.json({ error: "No providers available" }, { status: 400 });
      }

      const best = entries.reduce((min, curr) => (curr.price < min.price ? curr : min), entries[0]);
      const markup = Number(country.markupPercent) || 0;
      pkrPrice = Number((best.price * USD_TO_PKR * (1 + markup / 100)).toFixed(2));
    }

    if (balance < pkrPrice) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const result = await getNumberV2({
      service: SERVICE,
      country: country.smsbowerCountryId,
      providerIds: country.providerIds || undefined,
      maxPrice: Number((pkrPrice / USD_TO_PKR).toFixed(3)),
    });

    if (result.error || !result.activationId || !result.phoneNumber) {
      return NextResponse.json({ error: result.error || "Failed to get number" }, { status: 400 });
    }

    const costUsd = Number(result.activationCost || result.cost || pkrPrice / USD_TO_PKR);
    const salePricePkr = pkrPrice;

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: String((balance - salePricePkr).toFixed(4)), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await tx.insert(transactions).values({
        userId: user.id,
        type: "number_purchase",
        amount: String(salePricePkr.toFixed(4)),
        status: "completed",
        method: "balance",
        notes: `Bought ${SERVICE} number ${result.phoneNumber} (${country.name})`,
      });

      await tx.insert(activations).values({
        userId: user.id,
        countryId: country.id,
        smsbowerActivationId: String(result.activationId),
        service: SERVICE,
        phoneNumber: String(result.phoneNumber),
        cost: String(costUsd.toFixed(4)),
        salePrice: String(salePricePkr.toFixed(4)),
        status: "pending",
        providerIds: country.providerIds || "",
      });
    });

    await refreshSessionUser(user.id);

    return NextResponse.json({
      activationId: result.activationId,
      phoneNumber: result.phoneNumber,
      cost: salePricePkr,
      country: country.name,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
