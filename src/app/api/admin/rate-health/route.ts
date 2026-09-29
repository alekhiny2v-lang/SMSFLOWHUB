import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { countries, countryProviderRates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildCountryStock, inStockQuotes, isSellable, loadStockBoard, parseProviderIds } from "@/lib/providers";

/**
 * "Can this country actually be sold right now?" — the admin-side answer to
 * *"why does my panel say out of stock when the stock is clearly there?"*
 *
 * The catalogue stores a selling rate, but provider prices move. The moment the
 * live cheapest price climbs above that rate, every order is rejected by the
 * aggregator with `NO_NUMBERS` — which the client is shown as "out of stock"
 * for a country holding hundreds of numbers. This endpoint cross-checks the
 * saved rate against the live snapshot and lists the countries where the rate
 * (not the stock) is the problem, so it can be fixed instead of guessed at.
 *
 *   GET /api/admin/rate-health?service=fb
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";

    const [countryRows, rateCards, board] = await Promise.all([
      db.select().from(countries).where(eq(countries.active, true)),
      db.select().from(countryProviderRates),
      loadStockBoard(service),
    ]);
    const pricing = board.pricing;

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

    const rows = countryRows
      .map((country) => {
        const smsbowerCountryId = Number(country.smsbowerCountryId);
        const base = {
          countryId: country.id,
          name: country.name,
          code: country.code,
          smsbowerCountryId: country.smsbowerCountryId,
        };

        if (!Number.isFinite(smsbowerCountryId)) {
          return { ...base, status: "no_live_data" as const, rate: null, cheapestCostPkr: null, stock: 0, gapPkr: null, providers: [] };
        }

        const stock = buildCountryStock(
          smsbowerCountryId,
          board.snapshot.get(smsbowerCountryId),
          service,
          pricing,
          {
            profitPkr: country.profitPkr === null || country.profitPkr === undefined ? null : Number(country.profitPkr),
            markupPercent: Number(country.markupPercent) || 0,
            providerRates: cardMap.get(Number(country.id)),
          },
          board.directory,
        );

        const configured = parseProviderIds(country.providerIds);
        const inStock = inStockQuotes(stock, configured);
        const fixedRate = country.sellingPkrPrice ? Number(country.sellingPkrPrice) : null;
        const rateFor = (quote: { pkrPrice: number }) => fixedRate ?? quote.pkrPrice;
        const sellable = inStock.filter((quote) => isSellable(quote, rateFor(quote)));

        const cheapest = inStock[0] ?? null;
        const cheapestCostPkr = cheapest ? cheapest.costPkr : null;
        const rate = cheapest ? Math.ceil(rateFor(cheapest)) : fixedRate === null ? null : Math.ceil(fixedRate);

        const status = !stock || stock.providers.length === 0
          ? ("no_live_data" as const)
          : inStock.length === 0
            ? ("no_stock" as const)
            : sellable.length === 0
              ? ("rate_below_cost" as const)
              : ("ok" as const);

        return {
          ...base,
          status,
          rate,
          cheapestCostPkr,
          stock: inStock.reduce((sum, quote) => sum + quote.count, 0),
          // How much the rate would have to rise (PKR per number) to buy again.
          gapPkr: cheapestCostPkr !== null && rate !== null ? Math.max(0, cheapestCostPkr - rate) : null,
          providers: inStock.slice(0, 5).map((quote) => ({
            providerId: quote.providerId,
            count: quote.count,
            costPkr: quote.costPkr,
            pkrPrice: rateFor(quote),
            sellable: isSellable(quote, rateFor(quote)),
          })),
        };
      })
      .sort((a, b) => {
        const rank = (s: string) => (s === "rate_below_cost" ? 0 : s === "no_stock" ? 1 : s === "no_live_data" ? 2 : 3);
        return rank(a.status) - rank(b.status) || String(a.name).localeCompare(String(b.name));
      });

    const count = (status: string) => rows.filter((row) => row.status === status).length;

    return NextResponse.json({
      service,
      usdToPkr: pricing.usdToPkr,
      defaultProfitPkr: pricing.defaultProfitPkr,
      counts: {
        total: rows.length,
        ok: count("ok"),
        rateBelowCost: count("rate_below_cost"),
        noStock: count("no_stock"),
        noLiveData: count("no_live_data"),
      },
      results: rows,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
