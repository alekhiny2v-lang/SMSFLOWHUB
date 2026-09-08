import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "@/db/query";

/**
 * Money rules for the whole panel.
 *
 * A number is sold at `provider cost (USD) × USD→PKR + profit (PKR)`, where the
 * profit is a flat amount per number (6–7 PKR by default) instead of a
 * percentage: a percentage makes cheap numbers unsellable and expensive ones
 * overpriced. Every layer (country, per-provider rate, custom user rate) can
 * override the profit, and the cheapest provider for a country wins.
 */

export const DEFAULT_USD_TO_PKR = 280;
export const DEFAULT_PROFIT_PKR = 7;
export const RECOMMENDED_PROFIT_MIN = 6;
export const RECOMMENDED_PROFIT_MAX = 7;

export const SETTING_USD_TO_PKR = "usd_to_pkr";
export const SETTING_DEFAULT_PROFIT = "default_profit_pkr";

export type PricingSettings = {
  usdToPkr: number;
  defaultProfitPkr: number;
};

const SETTINGS_TTL_MS = 30_000;
let cache: (PricingSettings & { at: number }) | null = null;

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampProfit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(5000, parsed);
}

/** Read the rate + default profit (cached briefly so list pages stay fast). */
export async function getPricingSettings(force = false): Promise<PricingSettings> {
  if (!force && cache && Date.now() - cache.at < SETTINGS_TTL_MS) {
    return { usdToPkr: cache.usdToPkr, defaultProfitPkr: cache.defaultProfitPkr };
  }

  let usdToPkr = DEFAULT_USD_TO_PKR;
  let defaultProfitPkr = DEFAULT_PROFIT_PKR;

  try {
    const rows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTING_USD_TO_PKR));
    const profitRows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTING_DEFAULT_PROFIT));

    if (rows[0]) usdToPkr = toNumber(rows[0].value, DEFAULT_USD_TO_PKR);
    if (profitRows[0]) defaultProfitPkr = clampProfit(profitRows[0].value, DEFAULT_PROFIT_PKR);
  } catch {
    // Database unreachable — fall back to the compiled-in defaults so the
    // admin UI still renders something sensible.
  }

  cache = { usdToPkr, defaultProfitPkr, at: Date.now() };
  return { usdToPkr, defaultProfitPkr };
}

export async function savePricingSettings(input: Partial<PricingSettings>): Promise<PricingSettings> {
  const current = await getPricingSettings(true);
  const usdToPkr = input.usdToPkr === undefined ? current.usdToPkr : toNumber(input.usdToPkr, current.usdToPkr);
  const defaultProfitPkr =
    input.defaultProfitPkr === undefined
      ? current.defaultProfitPkr
      : clampProfit(input.defaultProfitPkr, current.defaultProfitPkr);

  for (const [key, value] of [
    [SETTING_USD_TO_PKR, String(usdToPkr)],
    [SETTING_DEFAULT_PROFIT, String(defaultProfitPkr)],
  ] as const) {
    const existing = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, key));
    if (existing.length) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  cache = { usdToPkr, defaultProfitPkr, at: Date.now() };
  return { usdToPkr, defaultProfitPkr };
}

/** Always round the selling price up so the profit target is never undershot. */
export function roundPkr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

export function toPkr(usdPrice: number, usdToPkr: number): number {
  return Number(usdPrice) * usdToPkr;
}

export type SellingPriceInput = {
  /** Provider cost for one number, in USD. */
  usdPrice: number;
  usdToPkr: number;
  /** Flat PKR profit. Wins over `markupPercent` when set. */
  profitPkr?: number | null;
  /** Legacy percentage markup, only used when no flat profit is configured. */
  markupPercent?: number | null;
  /** Fixed PKR selling price (country override / custom user rate). */
  fixedPkrPrice?: number | null;
};

/**
 * Selling price for one number.
 *
 * fixed price → flat profit → legacy markup → default flat profit.
 */
export function sellingPricePkr(input: SellingPriceInput): number {
  const { usdPrice, usdToPkr } = input;
  if (input.fixedPkrPrice !== undefined && input.fixedPkrPrice !== null && Number(input.fixedPkrPrice) > 0) {
    return roundPkr(Number(input.fixedPkrPrice));
  }
  const cost = toPkr(usdPrice, usdToPkr);
  const profit = input.profitPkr === undefined || input.profitPkr === null || Number.isNaN(Number(input.profitPkr))
    ? null
    : Number(input.profitPkr);
  if (profit !== null) return roundPkr(cost + profit);

  const markup = Number(input.markupPercent);
  if (Number.isFinite(markup) && markup > 0) return roundPkr(cost * (1 + markup / 100));

  return roundPkr(cost + DEFAULT_PROFIT_PKR);
}

/** Pick the cheapest provider that actually has stock. */
export function pickCheapestProvider<T extends { usdPrice: number; count?: number }>(
  providers: T[],
): T | null {
  const inStock = providers.filter((p) => (p.count ?? 0) > 0);
  const pool = inStock.length ? inStock : providers;
  if (!pool.length) return null;
  return pool.reduce((best, current) => (current.usdPrice < best.usdPrice ? current : best), pool[0]);
}
