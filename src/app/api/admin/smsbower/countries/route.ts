import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCountries, getPricesV3 } from "@/lib/smsbower";

export async function GET() {
  try {
    await requireAdmin();
    const [countries, prices] = await Promise.all([getCountries(), getPricesV3("fb")]);

    const list = Object.entries(countries as Record<string, { id: number; eng: string }>).map(([code, data]) => {
      const fbProviders = prices?.[String(data.id)]?.["fb"] ? Object.keys(prices[String(data.id)]["fb"]) : [];
      return {
        code,
        smsbowerCountryId: data.id,
        name: data.eng || code,
        providerCount: fbProviders.length,
      };
    });

    return NextResponse.json({ countries: list });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
