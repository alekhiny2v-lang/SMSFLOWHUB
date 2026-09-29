/** Overridable so staging setups (and tests) can point at another endpoint. */
const BASE_URL = process.env.SMSBOWER_BASE_URL || "https://smsbower.page/stubs/handler_api.php";

function getApiKey(): string {
  const key = process.env.SMSBOWER_API_KEY;
  if (!key) throw new Error("SMSBOWER_API_KEY is not configured");
  return key;
}

async function fetchApi(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  searchParams.append("api_key", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SMSBOWER HTTP error ${res.status}`);
  }
  const text = await res.text();
  return text;
}

export async function getBalance() {
  return fetchApi({ action: "getBalance" });
}

export async function getServicesList() {
  const text = await fetchApi({ action: "getServicesList" });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function getCountries() {
  const text = await fetchApi({ action: "getCountries" });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function getPrices(service?: string, country?: string | number) {
  const text = await fetchApi({ action: "getPrices", service, country });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function getPricesV3(service?: string, country?: string | number) {
  const text = await fetchApi({ action: "getPricesV3", service, country });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function getNumber(options: {
  service: string;
  country: number | string;
  maxPrice?: number;
  providerIds?: string;
  exceptProviderIds?: string;
  minPrice?: number;
  userID?: string;
}) {
  const text = await fetchApi({ action: "getNumber", ...options });
  return text;
}

export async function getNumberV2(options: {
  service: string;
  country: number | string;
  maxPrice?: number;
  providerIds?: string;
  exceptProviderIds?: string;
  minPrice?: number;
  userID?: string;
}) {
  const text = await fetchApi({ action: "getNumberV2", ...options });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

/**
 * Why a number order failed.
 *
 * `NO_NUMBERS` does **not** mean "this country has no numbers": the API answers
 * it whenever nothing matches the *parameters* we sent — and the parameter that
 * usually fails is `maxPrice`. A stale price list (the board is a snapshot), a
 * provider whose real price ticked up, or a selling rate that no longer covers
 * the provider cost all come back as `NO_NUMBERS`, which is exactly the "stock
 * is available but you say out of stock" complaint. `WRONG_MAX_PRICE:<min>` is
 * the explicit version of the same thing and carries the cheapest price the
 * provider will actually accept.
 */
export type NumberFailureKind =
  | "no_numbers"
  | "wrong_max_price"
  | "no_balance"
  | "too_many_attempts"
  | "too_many_active_orders"
  | "service_unavailable"
  | "other";

export type NumberFailure = {
  kind: NumberFailureKind;
  /** Cheapest price the provider accepts, when the API reports one (account currency). */
  minPrice: number | null;
  /** Raw API text — kept for logs/diagnostics. */
  raw: string;
};

const WRONG_MAX_PRICE_RE = /WRONG_MAX_PRICE\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i;

/** Normalise any error shape (string, or a JSON envelope) to plain text. */
export function rawErrorMessage(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : JSON.stringify(value);
  text = String(text).trim();
  // Some endpoints answer with `{"error":"NO_NUMBERS"}` instead of plain text.
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
      const inner = parsed?.error ?? parsed?.message;
      if (typeof inner === "string") return inner.trim();
    } catch {
      // plain text that merely starts with a brace — keep it as-is
    }
  }
  return text;
}

export function classifyNumberFailure(value: unknown): NumberFailure {
  const raw = rawErrorMessage(value);
  const upper = raw.toUpperCase();

  if (upper.includes("WRONG_MAX_PRICE")) {
    const match = raw.match(WRONG_MAX_PRICE_RE);
    const minPrice = match ? Number(match[1]) : NaN;
    return { kind: "wrong_max_price", minPrice: Number.isFinite(minPrice) ? minPrice : null, raw };
  }
  if (/NO_NUMBERS|NO_NUMBER_AVAILABLE/.test(upper)) return { kind: "no_numbers", minPrice: null, raw };
  if (/TOO_MANY_ATTEMPTS/.test(upper)) return { kind: "too_many_attempts", minPrice: null, raw };
  if (/TOO_MANY_ACTIVE_ORDERS|TOO_MANY_ORDERS/.test(upper)) return { kind: "too_many_active_orders", minPrice: null, raw };
  if (/NO_BALANCE|NO_MONEY|NOT_ENOUGH|LOW_BALANCE/i.test(raw)) return { kind: "no_balance", minPrice: null, raw };
  if (
    /BAD_KEY|BAD_ACTION|BAD_SERVICE|WRONG_SERVICE|BAD_COUNTRY|BAD_STATUS|BANNED|PROHIBITED|SERVICE_UNAVAILABLE|UNAVAILABLE_REGION/.test(
      upper,
    )
  ) {
    return { kind: "service_unavailable", minPrice: null, raw };
  }
  return { kind: "other", minPrice: null, raw };
}

export async function getStatus(id: string | number) {
  return fetchApi({ action: "getStatus", id: String(id) });
}

export async function setStatus(id: string | number, status: number) {
  return fetchApi({ action: "setStatus", id: String(id), status: String(status) });
}

export async function getTopCountriesByService(service: string) {
  const text = await fetchApi({ action: "getTopCountriesByService", service });
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function parseBalance(response: string): number {
  const parts = response.split(":");
  if (parts.length === 2 && parts[0] === "ACCESS_BALANCE") {
    return Number(parts[1]) || 0;
  }
  return 0;
}

export function parseNumberResponse(response: string): { activationId: string; phoneNumber: string } | null {
  const parts = response.split(":");
  if (parts.length >= 3 && parts[0] === "ACCESS_NUMBER") {
    return { activationId: parts[1], phoneNumber: parts[2] };
  }
  return null;
}

export function parseStatusResponse(response: string): { status: string; code?: string } {
  const parts = response.split(":");
  return { status: parts[0], code: parts[1] };
}
