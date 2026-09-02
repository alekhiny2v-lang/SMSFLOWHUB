import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { countries, userCountryRates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { getPricesV3 } from "@/lib/smsbower";

const USD_TO_PKR = 280;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";

    const [countryRows, customRates] = await Promise.all([
      db.select().from(countries).where(eq(countries.active, true)),
      db
        .select({ countryId: userCountryRates.countryId, pkrPrice: userCountryRates.pkrPrice })
        .from(userCountryRates)
        .where(eq(userCountryRates.userId, user.id)),
    ]);

    const customRateMap = new Map(customRates.map((r) => [r.countryId, Number(r.pkrPrice)]));
    const prices = await getPricesV3(service);

    const result = countryRows
      .map((country) => {
        const smsbowerId = country.smsbowerCountryId;
        let count: number | null = null;
        let usdPrice: number | null = null;
        let markupPercent: number | null = null;

        // Always get live stock count and base price from SMSBOWER
        if (smsbowerId) {
          const countryKey = String(smsbowerId);
          const serviceData = prices?.[countryKey]?.[service];
          if (serviceData) {
            const entries = Object.values(serviceData) as Array<{
              provider_id: number;
              count: number;
              price: number;
            }>;
            if (entries.length) {
              const best = entries.reduce((min, curr) => (curr.price < min.price ? curr : min), entries[0]);
              count = best.count;
              usdPrice = best.price;
            }
          }
        }

        // Priority 1: User-specific custom rate
        const customPrice = customRateMap.get(country.id);
        if (customPrice !== undefined) {
          return {
            id: country.id,
            name: country.name,
            code: country.code,
            smsbowerCountryId: country.smsbowerCountryId,
            providerIds: country.providerIds,
            usdPrice,
            markupPercent: null,
            pkrPrice: Number(customPrice.toFixed(2)),
            count,
            isCustomRate: true,
            isFixedRate: false,
          };
        }

        // Priority 2: Country fixed selling price
        if (country.sellingPkrPrice) {
          return {
            id: country.id,
            name: country.name,
            code: country.code,
            smsbowerCountryId: country.smsbowerCountryId,
            providerIds: country.providerIds,
            usdPrice,
            markupPercent: null,
            pkrPrice: Number(Number(country.sellingPkrPrice).toFixed(2)),
            count,
            isCustomRate: false,
            isFixedRate: true,
          };
        }

        // Priority 3: Default markup-based price
        if (!smsbowerId || usdPrice === null) return null;

        const markup = Number(country.markupPercent) || 0;
        const pkrPrice = usdPrice * USD_TO_PKR * (1 + markup / 100);

        return {
          id: country.id,
          name: country.name,
          code: country.code,
          smsbowerCountryId: country.smsbowerCountryId,
          providerIds: country.providerIds,
          usdPrice,
          markupPercent: markup,
          pkrPrice: Number(pkrPrice.toFixed(2)),
          count,
          isCustomRate: false,
          isFixedRate: false,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
