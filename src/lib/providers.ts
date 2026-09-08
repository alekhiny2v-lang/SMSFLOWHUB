import { getCountries, getPricesV3 } from "./smsbower";
import { getPricingSettings, roundPkr, sellingPricePkr, toPkr, type PricingSettings } from "./pricing";
import { flagFromCode, getCountryCode } from "./country";

/**
 * Server-side view of the SMSBOWER catalogue: live price + *real* stock count
 * for every provider id on every country, with the PKR selling price already
 * worked out from the panel's profit rules.
 */

export type RawProvider = {
  providerId: number;
  /** Provider cost for one number, USD. */
  usdPrice: number;
  /** Real numbers the provider has on the shelf right now. */
  count: number;
};

export type ProviderQuote = RawProvider & {
  /** Provider cost converted to PKR. */
  costPkr: number;
  /** Flat PKR profit kept on this provider. */
  profitPkr: number;
  /** What the client pays for a number from this provider. */
  pkrPrice: number;
  /** True when the price came from a saved per-provider override. */
  fixed: boolean;
};

export type CountryStock = {
  smsbowerCountryId: number;
  countryCode: string | null;
  countryName: string | null;
  flag: string;
  providers: ProviderQuote[];
  cheapest: ProviderQuote | null;
  totalStock: number;
};

export type PricingOverrides = {
  usdToPkr?: number;
  defaultProfitPkr?: number;
  /** Country-level flat profit (PKR). */
  profitPkr?: number | null;
  /** Legacy markup %, used only when no flat profit is set anywhere. */
  markupPercent?: number | null;
  /** Per-provider overrides keyed by provider id. */
  providerRates?: Map<number, { profitPkr?: number | null; pkrPrice?: number | null; active?: boolean }>;
};

type ServiceEntry = { provider_id?: number; count?: number; price?: number };

/** `getCountries()` → id → { code, english name }. */
export type CountryDirectory = Map<number, { code: string; name: string }>;

export async function loadCountryDirectory(): Promise<CountryDirectory> {
  const directory: CountryDirectory = new Map();
  try {
    const raw = (await getCountries()) as Record<string, { id?: number; eng?: string }> | { error?: string };
    if (raw && typeof raw === "object" && !("error" in raw)) {
      for (const [code, data] of Object.entries(raw as Record<string, { id?: number; eng?: string }>)) {
        if (!data || typeof data !== "object") continue;
        const id = Number(data.id);
        if (!Number.isFinite(id)) continue;
        directory.set(id, { code: String(code).toLowerCase(), name: String(data.eng || code) });
      }
    }
  } catch {
    // Catalogue unavailable — names/flags fall back to whatever the row holds.
  }
  return directory;
}

/** Live price + stock for one service, keyed by SMSBOWER country id. */
export async function loadProviderSnapshot(
  service: string,
): Promise<Map<number, Record<string, Record<string, ServiceEntry>>>> {
  const raw = (await getPricesV3(service)) as
    | Record<string, Record<string, Record<string, ServiceEntry>>>
    | { error?: string };

  const snapshot = new Map<number, Record<string, Record<string, ServiceEntry>>>();
  if (raw && typeof raw === "object" && !("error" in raw)) {
    for (const [countryKey, services] of Object.entries(raw as Record<string, Record<string, Record<string, ServiceEntry>>>)) {
      const id = Number(countryKey);
      if (!Number.isFinite(id) || !services || typeof services !== "object") continue;
      snapshot.set(id, services);
    }
  }
  return snapshot;
}

function quoteFrom(
  raw: RawProvider,
  pricing: PricingSettings,
  overrides: PricingOverrides,
  rate?: { profitPkr?: number | null; pkrPrice?: number | null },
): ProviderQuote {
  const usdToPkr = overrides.usdToPkr ?? pricing.usdToPkr;
  const fallbackProfit = overrides.profitPkr ?? pricing.defaultProfitPkr;

  const rateProfit = rate?.profitPkr === undefined || rate?.profitPkr === null ? null : Number(rate.profitPkr);
  const ratePrice =
    rate?.pkrPrice === undefined || rate?.pkrPrice === null || Number(rate.pkrPrice) <= 0
      ? null
      : Number(rate.pkrPrice);

  const profitPkr = rateProfit ?? fallbackProfit;
  const pkrPrice =
    ratePrice !== null
      ? roundPkr(ratePrice)
      : sellingPricePkr({ usdPrice: raw.usdPrice, usdToPkr, profitPkr, markupPercent: overrides.markupPercent });

  return {
    ...raw,
    costPkr: roundPkr(toPkr(raw.usdPrice, usdToPkr)),
    profitPkr: Number(profitPkr) || 0,
    pkrPrice,
    // true when a saved per-provider rate (price or profit) drove the number
    fixed: ratePrice !== null || rateProfit !== null,
  };
}

/** Turn one country's raw service block into priced provider quotes. */
export function buildCountryStock(
  smsbowerCountryId: number,
  services: Record<string, Record<string, ServiceEntry>> | undefined,
  service: string,
  pricing: PricingSettings,
  overrides: PricingOverrides = {},
  directory?: CountryDirectory,
): CountryStock | null {
  const block = services?.[service];
  if (!block) return null;

  const seen = new Set<number>();
  const raws: RawProvider[] = [];
  for (const entry of Object.values(block)) {
    if (!entry || typeof entry !== "object") continue;
    const providerId = Number(entry.provider_id);
    if (!Number.isFinite(providerId) || seen.has(providerId)) continue;
    seen.add(providerId);
    raws.push({
      providerId,
      usdPrice: Number(entry.price) || 0,
      count: Number(entry.count) || 0,
    });
  }
  if (!raws.length) return null;

  const activeRates = overrides.providerRates;
  const quotes = raws
    .filter((raw) => {
      const rate = activeRates?.get(raw.providerId);
      return rate?.active === false ? false : true;
    })
    .map((raw) => quoteFrom(raw, pricing, overrides, activeRates?.get(raw.providerId)))
    .sort((a, b) => a.usdPrice - b.usdPrice);

  if (!quotes.length) return null;

  const info = directory?.get(smsbowerCountryId);
  const countryCode = info?.code ?? null;
  const countryName = info?.name ?? null;
  const flag = flagFromCode(countryCode ?? getCountryCode(countryName) ?? undefined);

  return {
    smsbowerCountryId,
    countryCode,
    countryName,
    flag,
    providers: quotes,
    cheapest: quotes[0],
    totalStock: quotes.reduce((sum, q) => sum + q.count, 0),
  };
}

/** "1,4,9" → [1, 4, 9]. Tolerates spaces and stray separators. */
export function parseProviderIds(value?: string | null): number[] {
  if (!value) return [];
  return String(value)
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

export function formatProviderIds(ids: Array<number | string>): string {
  return [...new Set(ids.map((id) => Number(id)).filter((n) => Number.isFinite(n)))].join(",");
}

/** Everything a stock screen needs in one round-trip. */
export async function loadStockBoard(service: string) {
  const [pricing, directory, snapshot] = await Promise.all([
    getPricingSettings(),
    loadCountryDirectory(),
    loadProviderSnapshot(service),
  ]);
  return { pricing, directory, snapshot };
}

export async function quoteForCountry(
  input: {
    smsbowerCountryId: number;
    service: string;
    profitPkr?: number | null;
    markupPercent?: number | null;
    providerIds?: string | null;
    providerRates?: Map<number, { profitPkr?: number | null; pkrPrice?: number | null; active?: boolean }>;
  },
  board?: Awaited<ReturnType<typeof loadStockBoard>>,
) {
  const { pricing, directory, snapshot } = board ?? (await loadStockBoard(input.service));
  const stock = buildCountryStock(
    input.smsbowerCountryId,
    snapshot.get(input.smsbowerCountryId),
    input.service,
    pricing,
    {
      profitPkr: input.profitPkr ?? null,
      markupPercent: input.markupPercent ?? null,
      providerRates: input.providerRates,
    },
    directory,
  );
  if (!stock) return null;

  const allowed = parseProviderIds(input.providerIds);
  const providers = allowed.length ? stock.providers.filter((p) => allowed.includes(p.providerId)) : stock.providers;
  const usable = providers.length ? providers : stock.providers;

  return {
    ...stock,
    providers: usable,
    cheapest: usable[0] ?? null,
    totalStock: usable.reduce((sum, p) => sum + p.count, 0),
    pricing,
  };
}
