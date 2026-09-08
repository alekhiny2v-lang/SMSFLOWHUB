import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { countries, countryProviderRates, userCountryRates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { getCountryFlag } from "@/lib/country";
import { getPricingSettings, pickCheapestProvider, roundPkr, sellingPricePkr } from "@/lib/pricing";
import { buildCountryStock, loadStockBoard, parseProviderIds, type ProviderQuote } from "@/lib/providers";

/**
 * Live client price board.
 *
 * Stock is per provider: every provider id configured on a country is quoted
 * separately from SMSBOWER, and the country's stock is the sum of the
 * providers we would actually buy from. The selling price is the cheapest
 * provider's cost converted to PKR plus the flat profit kept on that country
 * (or the per-provider card, or the user's custom rate).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";

    const [countryRows, customRates, rateCards, pricing, board] = await Promise.all([
      db.select().from(countries).where(eq(countries.active, true)),
      db
        .select({ countryId: userCountryRates.countryId, pkrPrice: userCountryRates.pkrPrice })
        .from(userCountryRates)
        .where(eq(userCountryRates.userId, user.id)),
      db.select().from(countryProviderRates),
      getPricingSettings(),
      loadStockBoard(service),
    ]);

    const customRateMap = new Map(customRates.map((r) => [Number(r.countryId), Number(r.pkrPrice)]));

    // countryId → providerId → saved card
    const cardMap = new Map<number, Map<number, { profitPkr: number | null; pkrPrice: number | null; active: boolean }>>();
    for (const card of rateCards as any[]) {
      const countryId = Number(card.countryId);
      if (!Number.isFinite(countryId)) continue;
      if (!cardMap.has(countryId)) cardMap.set(countryId, new Map());
      cardMap.get(countryId)!.set(Number(card.providerId), {
        profitPkr: card.profitPkr === null || card.profitPkr === undefined ? null : Number(card.profitPkr),
        pkrPrice: card.pkrPrice ? Number(card.pkrPrice) : null,
        active: card.active !== false,
      });
    }

    const result = countryRows
      .map((country) => {
        const smsbowerId = Number(country.smsbowerCountryId);
        const configured = parseProviderIds(country.providerIds);

        let providers: ProviderQuote[] = [];
        let liveName: string | null = null;
        let liveCode: string | null = null;

        if (Number.isFinite(smsbowerId) && smsbowerId >= 0) {
          const services = board.snapshot.get(smsbowerId);
          const stockBlock = services
            ? buildCountryStock(
                smsbowerId,
                services,
                service,
                pricing,
                {
                  profitPkr: country.profitPkr === null || country.profitPkr === undefined ? null : Number(country.profitPkr),
                  markupPercent: Number(country.markupPercent) || 0,
                  providerRates: cardMap.get(Number(country.id)),
                },
                board.directory,
              )
            : null;

          if (stockBlock) {
            liveName = stockBlock.countryName;
            liveCode = stockBlock.countryCode;
            const scoped = configured.length
              ? stockBlock.providers.filter((p) => configured.includes(p.providerId))
              : stockBlock.providers;
            providers = scoped.length ? scoped : stockBlock.providers;
          }
        }

        const best = pickCheapestProvider(providers);
        const usdPrice = best ? best.usdPrice : null;
        const count = providers.length ? providers.reduce((sum, p) => sum + p.count, 0) : null;

        const countryProfit =
          country.profitPkr === null || country.profitPkr === undefined ? null : Number(country.profitPkr);
        const markup = Number(country.markupPercent) || 0;

        // Priority 1: user-specific custom rate
        const customPrice = customRateMap.get(Number(country.id));
        // Priority 2: fixed country selling price
        const fixedCountry = country.sellingPkrPrice ? Number(country.sellingPkrPrice) : null;
        // Priority 3: cheapest live provider, priced with the country's profit
        const livePrice = best
          ? sellingPricePkr({
              usdPrice: best.usdPrice,
              usdToPkr: pricing.usdToPkr,
              profitPkr: best.profitPkr ?? countryProfit,
              markupPercent: markup,
              fixedPkrPrice: best.fixed ? best.pkrPrice : null,
            })
          : null;

        let pkrPrice: number | null = null;
        let isCustomRate = false;
        let isFixedRate = false;

        if (customPrice !== undefined && Number.isFinite(customPrice)) {
          pkrPrice = roundPkr(customPrice);
          isCustomRate = true;
        } else if (fixedCountry) {
          pkrPrice = roundPkr(fixedCountry);
          isFixedRate = true;
        } else if (livePrice !== null) {
          pkrPrice = livePrice;
        } else if (countryProfit !== null || markup > 0) {
          pkrPrice = null;
        }

        return {
          id: country.id,
          name: country.name,
          code: liveCode || country.code,
          flag: getCountryFlag(country.code || country.name),
          smsbowerCountryId: country.smsbowerCountryId,
          providerIds: country.providerIds,
          usdPrice,
          profitPkr: countryProfit,
          markupPercent: markup,
          pkrPrice,
          count,
          isCustomRate,
          isFixedRate,
          liveName,
          bestProviderId: best ? best.providerId : null,
          providers: providers.map((p) => ({
            providerId: p.providerId,
            usdPrice: p.usdPrice,
            count: p.count,
            costPkr: p.costPkr,
            pkrPrice: isCustomRate || isFixedRate ? pkrPrice : p.pkrPrice,
          })),
        };
      })
      .filter((row) => row.pkrPrice !== null);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
