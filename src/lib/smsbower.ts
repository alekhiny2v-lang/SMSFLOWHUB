const BASE_URL = "https://smsbower.page/stubs/handler_api.php";

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
