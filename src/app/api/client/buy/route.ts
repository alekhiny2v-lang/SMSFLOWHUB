import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "@/db/query";
import { db } from "@/db";
import { users, countries, activations, transactions, userCountryRates, countryProviderRates } from "@/db/schema";
import { requireAuth, refreshSessionUser } from "@/lib/auth";
import { getNumberV2 } from "@/lib/smsbower";
import { getPricingSettings, pickCheapestProvider, roundPkr, sellingPricePkr } from "@/lib/pricing";
import { buildCountryStock, loadStockBoard, parseProviderIds } from "@/lib/providers";

const SERVICE = "fb";

/**
 * Buy one number.
 *
 * The number is pulled from the cheapest live provider that actually has stock
 * on that country (restricted to the providers configured on the country), and
 * sold at `provider cost × USD→PKR + profit`. The provider that served the
 * number is stored on the activation so the sale can be traced back to it.
 */
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
    if (!country || !country.active || country.smsbowerCountryId === null || country.smsbowerCountryId === undefined) {
      return NextResponse.json({ error: "Invalid country" }, { status: 400 });
    }

    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, user.id));
    const balance = Number(userRows[0]?.balance || 0);
    const pricing = await getPricingSettings();

    // Priority 1: user-specific custom rate
    const customRateRows = await db
      .select({ pkrPrice: userCountryRates.pkrPrice })
      .from(userCountryRates)
      .where(and(eq(userCountryRates.userId, user.id), eq(userCountryRates.countryId, country.id)));

    let pkrPrice: number;
    let chosen: { providerId: number; usdPrice: number } | null = null;

    if (customRateRows.length > 0) {
      pkrPrice = roundPkr(Number(customRateRows[0].pkrPrice));
    } else if (country.sellingPkrPrice) {
      // Priority 2: country fixed selling price
      pkrPrice = roundPkr(Number(country.sellingPkrPrice));
    } else {
      // Priority 3: live cheapest provider + the country's flat profit
      const [board, cards] = await Promise.all([
        loadStockBoard(SERVICE),
        db.select().from(countryProviderRates).where(eq(countryProviderRates.countryId, country.id)),
      ]);

      const cardMap = new Map<number, { profitPkr: number | null; pkrPrice: number | null; active: boolean }>();
      for (const card of cards as any[]) {
        cardMap.set(Number(card.providerId), {
          profitPkr: card.profitPkr === null || card.profitPkr === undefined ? null : Number(card.profitPkr),
          pkrPrice: card.pkrPrice ? Number(card.pkrPrice) : null,
          active: card.active !== false,
        });
      }

      const stock = buildCountryStock(
        Number(country.smsbowerCountryId),
        board.snapshot.get(Number(country.smsbowerCountryId)),
        SERVICE,
        pricing,
        {
          profitPkr: country.profitPkr === null || country.profitPkr === undefined ? null : Number(country.profitPkr),
          markupPercent: Number(country.markupPercent) || 0,
          providerRates: cardMap,
        },
        board.directory,
      );

      const configured = parseProviderIds(country.providerIds);
      const scoped = stock?.providers.filter((p) => (configured.length ? configured.includes(p.providerId) : true) && p.count > 0);
      const best = pickCheapestProvider(scoped ?? []);

      if (!stock || !best) {
        return NextResponse.json({ error: "Out of stock — no numbers available right now" }, { status: 400 });
      }

      chosen = { providerId: best.providerId, usdPrice: best.usdPrice };
      pkrPrice = sellingPricePkr({
        usdPrice: best.usdPrice,
        usdToPkr: pricing.usdToPkr,
        profitPkr: best.profitPkr,
        markupPercent: Number(country.markupPercent) || 0,
        fixedPkrPrice: best.fixed ? best.pkrPrice : null,
      });
    }

    if (balance < pkrPrice) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // No live quote (custom / fixed rate): still target the country's providers.
    let providerIds = country.providerIds || undefined;
    let maxPrice: number | undefined;
    if (chosen) {
      providerIds = String(chosen.providerId);
      maxPrice = Number((chosen.usdPrice + 0.0001).toFixed(4));
    } else {
      maxPrice = Number((pkrPrice / pricing.usdToPkr).toFixed(3));
    }

    const result = await getNumberV2({
      service: SERVICE,
      country: country.smsbowerCountryId,
      providerIds,
      maxPrice,
    });

    if (result.error || !result.activationId || !result.phoneNumber) {
      const message = String(result.error || "");
      const friendly = /NO_NUMBERS|no numbers/i.test(message)
        ? "Out of stock — try another country"
        : /NO_BALANCE|not enough/i.test(message)
          ? "Provider balance is low — contact support"
          : result.error || "Failed to get number";
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    const costUsd = Number(result.activationCost ?? result.cost ?? chosen?.usdPrice ?? pkrPrice / pricing.usdToPkr);
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
        providerId: chosen ? String(chosen.providerId) : null,
        smsbowerActivationId: String(result.activationId),
        service: SERVICE,
        phoneNumber: String(result.phoneNumber),
        cost: String(Number(costUsd).toFixed(4)),
        salePrice: String(salePricePkr.toFixed(4)),
        status: "pending",
        providerIds: providerIds || "",
      });
    });

    await refreshSessionUser(user.id);

    return NextResponse.json({
      activationId: result.activationId,
      phoneNumber: result.phoneNumber,
      cost: salePricePkr,
      providerId: chosen?.providerId ?? null,
      country: country.name,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
