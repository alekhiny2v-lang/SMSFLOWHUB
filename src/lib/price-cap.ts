/**
 * Price caps for number orders.
 *
 * `getNumber`/`getNumberV2` take a `maxPrice`: *the most we are willing to pay
 * for the number*, and the aggregator charges the actual (cheapest available)
 * price of whatever it sells us — never more than the cap. Without a cap, only
 * the cheapest offer is considered; with one, pricier offers are tried
 * automatically up to the cap. Everything above the cap comes back as
 * `NO_NUMBERS` / `WRONG_MAX_PRICE`, which a client reads as "this country is out
 * of stock" even when every provider is stocked.
 *
 * Two mistakes made that happen constantly:
 *
 *   1. the cap was the quoted price plus $0.0001 — the moment the cheapest
 *      offer sold out (or the price list was a few seconds stale) the next
 *      offer was above the cap and the whole country looked empty;
 *   2. the cap was derived from the *selling* rate and rounded down
 *      (`toFixed(3)`), so a fixed-rate country could never buy at its own
 *      listed price.
 *
 * So: keep a margin wide enough to absorb a real price move, never round the cap
 * down, and never let it exceed what the sale itself covers.
 */

/** Round a USD amount *up*, so a cap can never land below the price it covers. */
export function ceilUsd(value: number, decimals = 5): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.ceil(value * factor - 1e-9) / factor;
}

/** Smallest extra room over the quoted price, in USD (≈ 0.14 PKR). */
export const PRICE_MARGIN_MIN_USD = 0.0005;
/** Relative extra room, so a normal price move doesn't kill the sale. */
export const PRICE_MARGIN_PCT = 0.15;

/**
 * The most we are willing to pay for one number.
 *
 * `usdPrice` is the provider's quoted price and `budgetUsd` the highest price
 * that still leaves the sale profitable (what the client is charged, converted
 * to USD). The cap is the quoted price plus a margin, clamped to the budget —
 * so a provider is never asked to sell above what we charge for it.
 */
export function orderPriceCap(usdPrice: number, budgetUsd: number): number {
  const price = Number(usdPrice) || 0;
  const budget = Number(budgetUsd) || 0;
  const margin = Math.max(PRICE_MARGIN_MIN_USD, price * PRICE_MARGIN_PCT);
  return Math.min(ceilUsd(price + margin), ceilUsd(budget));
}
