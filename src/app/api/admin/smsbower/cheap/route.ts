import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPricingSettings } from "@/lib/pricing";
import {
  buildCountryStock,
  loadCountryDirectory,
  loadProviderSnapshot,
  type CountryStock,
} from "@/lib/providers";

/**
 * Cheapest-rate country fetch.
 *
 * Returns every country that has at least one provider under `maxPrice`, with
 * the country's real name + flag and one row per provider (live price, live
 * stock, and the PKR price the panel would sell at). The admin UI puts an
 * "Add" button on each row so the country id + providers can be imported into
 * the catalogue in one click.
 *
 *   GET /api/admin/smsbower/cheap?service=fb&maxPrice=0.034&minCount=1&limit=100
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";
    const maxPrice = Number(searchParams.get("maxPrice") || "0.034");
    const minCount = Number(searchParams.get("minCount") || "0");
    const limit = Number(searchParams.get("limit") || "0");
    const sort = searchParams.get("sort") || "price";

    const [pricing, directory, snapshot] = await Promise.all([
      getPricingSettings(),
      loadCountryDirectory(),
      loadProviderSnapshot(service),
    ]);

    const results: CountryStock[] = [];
    for (const [countryId, services] of snapshot) {
      const stock = buildCountryStock(countryId, services, service, pricing, {}, directory);
      if (!stock) continue;

      const providers = stock.providers.filter((p) => p.usdPrice > 0 && p.usdPrice < maxPrice);
      const stocked = minCount > 0 ? providers.filter((p) => p.count >= minCount) : providers;
      if (!stocked.length) continue;

      results.push({
        ...stock,
        providers: stocked,
        cheapest: stocked[0],
        totalStock: stocked.reduce((sum, p) => sum + p.count, 0),
      });
    }

    results.sort((a, b) => {
      if (sort === "stock") return b.totalStock - a.totalStock;
      if (sort === "name") return (a.countryName || String(a.smsbowerCountryId)).localeCompare(b.countryName || String(b.smsbowerCountryId));
      return (a.cheapest?.usdPrice ?? Infinity) - (b.cheapest?.usdPrice ?? Infinity);
    });

    const trimmed = limit > 0 ? results.slice(0, limit) : results;

    return NextResponse.json({
      service,
      maxPrice,
      minCount,
      usdToPkr: pricing.usdToPkr,
      defaultProfitPkr: pricing.defaultProfitPkr,
      count: trimmed.length,
      totalCountries: results.length,
      results: trimmed,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
