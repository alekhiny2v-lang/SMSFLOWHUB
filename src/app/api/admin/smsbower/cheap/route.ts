import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPricesV3 } from "@/lib/smsbower";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || "fb";
    const maxPrice = Number(searchParams.get("maxPrice") || "0.034");

    const prices = await getPricesV3(service);
    const results: Array<{
      countryCode: string;
      smsbowerCountryId: number;
      providers: Array<{ providerId: number; price: number; count: number }>;
    }> = [];

    for (const [countryCode, services] of Object.entries(prices as Record<string, Record<string, Record<string, { provider_id: number; price: number; count: number }>>>)) {
      const serviceData = services[service];
      if (!serviceData) continue;

      const cheapProviders = Object.values(serviceData)
        .filter((p) => p.price < maxPrice)
        .map((p) => ({ providerId: p.provider_id, price: p.price, count: p.count }));

      if (cheapProviders.length > 0) {
        results.push({
          countryCode,
          smsbowerCountryId: Number(countryCode),
          providers: cheapProviders,
        });
      }
    }

    results.sort((a, b) => {
      const minA = Math.min(...a.providers.map((p) => p.price));
      const minB = Math.min(...b.providers.map((p) => p.price));
      return minA - minB;
    });

    return NextResponse.json({ maxPrice, service, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
