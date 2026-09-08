import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROFIT_PKR,
  DEFAULT_USD_TO_PKR,
  RECOMMENDED_PROFIT_MAX,
  RECOMMENDED_PROFIT_MIN,
  getPricingSettings,
  savePricingSettings,
} from "@/lib/pricing";

/** Panel-wide money rules: USD→PKR rate and the default profit per number. */
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getPricingSettings(true);
    return NextResponse.json({
      ...settings,
      defaults: {
        usdToPkr: DEFAULT_USD_TO_PKR,
        profitPkr: DEFAULT_PROFIT_PKR,
        recommendedProfit: [RECOMMENDED_PROFIT_MIN, RECOMMENDED_PROFIT_MAX],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const usdToPkr = body.usdToPkr === undefined || body.usdToPkr === "" ? undefined : Number(body.usdToPkr);
    const defaultProfitPkr =
      body.defaultProfitPkr === undefined || body.defaultProfitPkr === "" ? undefined : Number(body.defaultProfitPkr);

    if (usdToPkr !== undefined && (!Number.isFinite(usdToPkr) || usdToPkr <= 0)) {
      return NextResponse.json({ error: "USD to PKR rate must be a positive number" }, { status: 400 });
    }
    if (defaultProfitPkr !== undefined && (!Number.isFinite(defaultProfitPkr) || defaultProfitPkr < 0)) {
      return NextResponse.json({ error: "Profit must be zero or more" }, { status: 400 });
    }

    const settings = await savePricingSettings({ usdToPkr, defaultProfitPkr });
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
