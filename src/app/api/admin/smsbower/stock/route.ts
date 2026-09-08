import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPricingSettings } from "@/lib/pricing";
import {
  buildCountryStock,
  loadCountryDirectory,
  loadProviderSnapshot,
  parseProviderIds,
  type ProviderQuote,
} from "@/lib/providers";

/**
 * Live, per-provider stock for one country.
 *
 * Every provider id on that country is listed separately with its own real
 * stock count from SMSBOWER — not the country-level total — plus the PKR price
 * the panel would sell it at.
 *
 *   GET /api/admin/smsbower/stock?smsbowerCountryId=187&service=fb&profitPkr=7
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";
    const smsbowerCountryId = Number(searchParams.get("smsbowerCountryId") || "");
    const profitParam = searchParams.get("profitPkr");
    const markupParam = searchParams.get("markupPercent");
    const providerIds = searchParams.get("providerIds");

    if (!Number.isFinite(smsbowerCountryId)) {
      return NextResponse.json({ error: "smsbowerCountryId is required" }, { status: 400 });
    }

    const [pricing, directory, snapshot] = await Promise.all([
      getPricingSettings(),
      loadCountryDirectory(),
      loadProviderSnapshot(service),
    ]);

    const stock = buildCountryStock(
      smsbowerCountryId,
      snapshot.get(smsbowerCountryId),
      service,
      pricing,
      {
        profitPkr: profitParam === null || profitParam === "" ? null : Number(profitParam),
        markupPercent: markupParam === null || markupParam === "" ? null : Number(markupParam),
      },
      directory,
    );

    if (!stock) {
      return NextResponse.json(
        {
          service,
          smsbowerCountryId,
          providers: [],
          totalStock: 0,
          usdToPkr: pricing.usdToPkr,
          defaultProfitPkr: pricing.defaultProfitPkr,
          fetchedAt: new Date().toISOString(),
          empty: true,
        },
        { status: 200 },
      );
    }

    const allowed = parseProviderIds(providerIds);
    const providers: ProviderQuote[] = allowed.length
      ? stock.providers.filter((p) => allowed.includes(p.providerId))
      : stock.providers;

    return NextResponse.json({
      service,
      smsbowerCountryId,
      countryName: stock.countryName,
      countryCode: stock.countryCode,
      flag: stock.flag,
      usdToPkr: pricing.usdToPkr,
      defaultProfitPkr: pricing.defaultProfitPkr,
      providers: providers.length ? providers : stock.providers,
      configuredProviderIds: allowed,
      totalStock: (providers.length ? providers : stock.providers).reduce((sum, p) => sum + p.count, 0),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
