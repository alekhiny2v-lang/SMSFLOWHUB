import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "@/db/query";
import { db } from "@/db";
import { users, countries, activations, transactions, userCountryRates, countryProviderRates } from "@/db/schema";
import { requireAuth, refreshSessionUser } from "@/lib/auth";
import { getNumberV2, classifyNumberFailure, type NumberFailure } from "@/lib/smsbower";
import { roundPkr } from "@/lib/pricing";
import { buildCountryStock, inStockQuotes, isSellable, loadStockBoard, parseProviderIds, type ProviderQuote } from "@/lib/providers";
import { ceilUsd, orderPriceCap } from "@/lib/price-cap";

const SERVICE = "fb";

/** How many providers one buy may try before giving up. */
const MAX_PROVIDER_ATTEMPTS = 4;
const ATTEMPT_GAP_MS = 150;
const THROTTLE_BACKOFF_MS = 1500;

const RATE_UNAVAILABLE = "Temporarily unavailable at the current rate — try another country";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Candidate = { quote: ProviderQuote; salePkr: number };

/**
 * Buy one number.
 *
 * The number is pulled from the cheapest live provider that actually has stock
 * on that country (restricted to the providers configured on the country), and
 * sold at the price the panel's rules produce — custom user rate, fixed country
 * price, or the provider cost in PKR plus the country's profit. The provider
 * that served the number is stored on the activation so the sale can be traced
 * back to it.
 *
 * `getPricesV3` is a *snapshot*, so "the board says stock" and "the order went
 * through" are two different things. `NO_NUMBERS` means "nothing matched the
 * parameters" (usually the `maxPrice` cap), not "this country is empty", so a
 * single attempt against a single provider used to fail the whole purchase on a
 * normal price move or a stale counter. The buyer now walks the country's
 * in-stock providers cheapest-first, each with a rounded-up price cap, and only
 * gives up when every one of them says no.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { countryId } = body;

    if (!countryId) {
      return NextResponse.json({ error: "Country required" }, { status: 400 });
    }

    const countryRows = await db.select().from(countries).where(eq(countries.id, Number(countryId)));
    const country = countryRows[0];
    if (!country || !country.active || country.smsbowerCountryId === null || country.smsbowerCountryId === undefined) {
      return NextResponse.json({ error: "Invalid country" }, { status: 400 });
    }

    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, user.id));
    const balance = Number(userRows[0]?.balance || 0);

    const [board, cards, customRateRows] = await Promise.all([
      loadStockBoard(SERVICE),
      db.select().from(countryProviderRates).where(eq(countryProviderRates.countryId, country.id)),
      db
        .select({ pkrPrice: userCountryRates.pkrPrice })
        .from(userCountryRates)
        .where(and(eq(userCountryRates.userId, user.id), eq(userCountryRates.countryId, country.id))),
    ]);
    const pricing = board.pricing;

    const cardMap = new Map<number, { profitPkr: number | null; pkrPrice: number | null; active: boolean }>();
    for (const card of cards as any[]) {
      cardMap.set(Number(card.providerId), {
        profitPkr: card.profitPkr === null || card.profitPkr === undefined ? null : Number(card.profitPkr),
        pkrPrice: card.pkrPrice ? Number(card.pkrPrice) : null,
        active: card.active !== false,
      });
    }

    const smsbowerCountryId = Number(country.smsbowerCountryId);
    const stock = buildCountryStock(
      smsbowerCountryId,
      board.snapshot.get(smsbowerCountryId),
      SERVICE,
      pricing,
      {
        profitPkr: country.profitPkr === null || country.profitPkr === undefined ? null : Number(country.profitPkr),
        markupPercent: Number(country.markupPercent) || 0,
        providerRates: cardMap,
      },
      board.directory,
    );

    // Priority 1: user-specific custom rate
    const customRate = customRateRows.length > 0 ? roundPkr(Number(customRateRows[0].pkrPrice)) : null;
    // Priority 2: fixed country selling price
    const fixedRate = country.sellingPkrPrice ? roundPkr(Number(country.sellingPkrPrice)) : null;

    /**
     * What the client pays for a number from this provider: a custom/fixed rate
     * applies to the whole country, otherwise the provider's own quote
     * (`cost × USD→PKR + profit`, already resolved by `buildCountryStock`).
     */
    const priceFor = (quote: ProviderQuote): number => customRate ?? fixedRate ?? quote.pkrPrice;

    const configured = parseProviderIds(country.providerIds);
    const inStock = inStockQuotes(stock, configured);

    if (!inStock.length) {
      return NextResponse.json({ error: "Out of stock — no numbers available right now" }, { status: 400 });
    }

    const quotedPrice = priceFor(inStock[0]);
    if (balance < quotedPrice) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Only providers whose cost is still covered by what we charge, and whose
    // price the client's balance can pay for.
    const candidates: Candidate[] = inStock
      .map((quote) => ({ quote, salePkr: priceFor(quote) }))
      .filter(({ quote, salePkr }) => isSellable(quote, salePkr) && salePkr <= balance)
      .slice(0, MAX_PROVIDER_ATTEMPTS);

    if (!candidates.length) {
      console.warn(
        `[buy] ${country.name} (country=${smsbowerCountryId}) has ${inStock.reduce((sum, q) => sum + q.count, 0)} numbers in stock, ` +
          `but the selling rate (${quotedPrice} PKR) no longer covers the cheapest provider (${inStock[0].costPkr} PKR). ` +
          `Raise the country/custom rate — orders here will keep failing as "out of stock".`,
      );
      return NextResponse.json({ error: RATE_UNAVAILABLE }, { status: 400 });
    }

    let winner: Candidate | null = null;
    let reserved: { activationId: string | number; phoneNumber: string; costUsd: number } | null = null;
    const failures: NumberFailure[] = [];
    let stop = false;

    for (const candidate of candidates) {
      const { quote } = candidate;
      const budgetUsd = candidate.salePkr / pricing.usdToPkr;
      let maxPrice = orderPriceCap(quote.usdPrice, budgetUsd);
      let priceRetryUsed = false;
      let throttleRetryUsed = false;

      for (;;) {
        const result = await getNumberV2({
          service: SERVICE,
          country: smsbowerCountryId,
          providerIds: String(quote.providerId),
          maxPrice,
        });

        if (!result.error && result.activationId && result.phoneNumber) {
          winner = candidate;
          reserved = {
            activationId: result.activationId,
            phoneNumber: String(result.phoneNumber),
            costUsd: Number(result.activationCost ?? result.cost ?? quote.usdPrice),
          };
          break;
        }

        const failure = classifyNumberFailure(result.error);
        failures.push(failure);
        console.warn(
          `[buy] ${country.name} (country=${smsbowerCountryId}) provider=${quote.providerId} stock=${quote.count} ` +
            `cost=$${quote.usdPrice} maxPrice=$${maxPrice} → ${failure.kind}${failure.raw ? `: ${failure.raw}` : ""}`,
        );

        // Nothing about these improves by trying another provider.
        if (failure.kind === "no_balance" || failure.kind === "service_unavailable" || failure.kind === "too_many_active_orders") {
          stop = true;
          break;
        }

        if (failure.kind === "wrong_max_price" && !priceRetryUsed) {
          priceRetryUsed = true;
          const budgetCap = ceilUsd(budgetUsd);
          if (failure.minPrice !== null && failure.minPrice > budgetCap) {
            console.warn(
              `[buy] ${country.name}: provider ${quote.providerId} now needs $${failure.minPrice} but the listed rate only covers ` +
                `$${budgetUsd.toFixed(4)} (${candidate.salePkr} PKR). Raise the rate for this country.`,
            );
            break;
          }
          // The API told us the cheapest price it will accept — bid exactly that
          // (plus margin) as long as the sale still covers it.
          const raised = failure.minPrice === null ? budgetCap : orderPriceCap(failure.minPrice, budgetUsd);
          if (raised <= maxPrice) break;
          maxPrice = raised;
          continue;
        }

        if (failure.kind === "too_many_attempts" && !throttleRetryUsed) {
          throttleRetryUsed = true;
          await sleep(THROTTLE_BACKOFF_MS);
          continue;
        }

        // no_numbers / other → this provider is out: try the next one.
        break;
      }

      if (winner || stop) break;
      await sleep(ATTEMPT_GAP_MS);
    }

    /**
     * Last resort: walk all the way up to the most we can pay and still honour
     * the quoted price.
     *
     * Every provider's cheap offers can be gone while numbers remain on the
     * shelf a few PKR higher, and each provider's own margin is deliberately
     * modest. Rather than tell the client "out of stock" for a country that is
     * stocked, buy at the top of the budget: the aggregator charges the actual
     * price, so this only costs margin when it was the only way to sell at all.
     */
    if (!winner && !stop && candidates.length > 0) {
      const target = candidates[0];
      const escalationCap = ceilUsd(target.salePkr / pricing.usdToPkr);
      const priced = failures.some((f) => f.kind === "no_numbers" || f.kind === "wrong_max_price");
      if (priced && escalationCap > orderPriceCap(target.quote.usdPrice, escalationCap)) {
        const result = await getNumberV2({
          service: SERVICE,
          country: smsbowerCountryId,
          providerIds: String(target.quote.providerId),
          maxPrice: escalationCap,
        });

        if (!result.error && result.activationId && result.phoneNumber) {
          console.warn(
            `[buy] ${country.name}: sold on a walk-up order at up to $${escalationCap} ` +
              `(quoted $${target.quote.usdPrice}, ${target.salePkr} PKR charged) — margin was thinner than usual`,
          );
          winner = target;
          reserved = {
            activationId: result.activationId,
            phoneNumber: String(result.phoneNumber),
            costUsd: Number(result.activationCost ?? result.cost ?? target.quote.usdPrice),
          };
        } else {
          failures.push(classifyNumberFailure(result.error));
        }
      }
    }

    if (!winner || !reserved) {
      const kinds = new Set(failures.map((f) => f.kind));
      const error = kinds.has("no_balance")
        ? "Provider balance is low — contact support"
        : kinds.has("service_unavailable")
          ? "Number service is temporarily unavailable — contact support"
          : kinds.has("too_many_active_orders")
            ? "Too many numbers are open — finish or cancel one, then try again"
            : kinds.has("wrong_max_price")
              ? RATE_UNAVAILABLE
              : kinds.has("no_numbers")
                ? "Out of stock — try another country"
                : "Could not reserve a number right now — please try again";
      return NextResponse.json({ error }, { status: 400 });
    }

    const salePricePkr = winner.salePkr;
    const costUsd = Number(reserved.costUsd) || winner.quote.usdPrice;
    const providerIds = String(winner.quote.providerId);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: String((balance - salePricePkr).toFixed(4)), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await tx.insert(transactions).values({
        userId: user.id,
        type: "number_purchase",
        amount: String(salePricePkr.toFixed(4)),
        status: "completed",
        method: "balance",
        notes: `Bought ${SERVICE} number ${reserved!.phoneNumber} (${country.name})`,
      });

      await tx.insert(activations).values({
        userId: user.id,
        countryId: country.id,
        providerId: providerIds,
        smsbowerActivationId: String(reserved!.activationId),
        service: SERVICE,
        phoneNumber: reserved!.phoneNumber,
        cost: String(costUsd.toFixed(4)),
        salePrice: String(salePricePkr.toFixed(4)),
        status: "pending",
        providerIds,
      });
    });

    await refreshSessionUser(user.id);

    return NextResponse.json({
      activationId: reserved.activationId,
      phoneNumber: reserved.phoneNumber,
      cost: salePricePkr,
      providerId: winner.quote.providerId,
      country: country.name,
    });
  } catch (err) {
    const message = (err as Error).message;
    // Auth problems keep their 401; anything else (aggregator/network/db) is a
    // server-side hiccup, not a bad request from the client.
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[buy] failed:", err);
    return NextResponse.json({ error: "Could not reserve a number right now — please try again" }, { status: 500 });
  }
}
