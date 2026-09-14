export type Table = { collection: string; [key: string]: any };

function table(name: string, fields: string[]): Table {
  const result: Table = { collection: name };
  for (const field of fields) result[field] = { table: name, field };
  return result;
}

export const users = table("users", ["id", "username", "password", "role", "balance", "status", "createdAt", "updatedAt"]);
export const countries = table("countries", ["id", "name", "code", "smsbowerCountryId", "providerIds", "markupPercent", "profitPkr", "sellingPkrPrice", "active", "sortOrder", "createdAt", "updatedAt"]);
export const transactions = table("transactions", ["id", "userId", "type", "amount", "status", "method", "reference", "notes", "createdById", "createdAt", "updatedAt"]);
export const activations = table("activations", ["id", "userId", "countryId", "providerId", "smsbowerActivationId", "service", "phoneNumber", "cost", "salePrice", "status", "smsCode", "smsText", "providerIds", "retryCount", "expiresAt", "createdAt", "updatedAt"]);
export const settings = table("settings", ["key", "value", "updatedAt"]);
// Per-country / per-provider rate card: each provider on a country can carry
// its own profit and selling price, refreshed from live SMSBOWER stock.
export const countryProviderRates = table("country_provider_rates", ["id", "countryId", "providerId", "service", "usdPrice", "stock", "costPkr", "profitPkr", "pkrPrice", "active", "updatedAt", "createdAt"]);
export const userCountryRates = table("user_country_rates", ["id", "userId", "countryId", "pkrPrice", "createdAt", "updatedAt"]);
export const paymentMethods = table("payment_methods", ["id", "userId", "type", "accountName", "accountNumber", "notes", "isDefault", "createdAt", "updatedAt"]);
export const depositAccounts = table("deposit_accounts", ["id", "type", "accountName", "accountNumber", "instructions", "active", "sortOrder", "createdAt", "updatedAt"]);

// Proxy store: admin-stocked proxy accounts (host:port:user:pass) sold to
// clients at a fixed PKR price. Each row is one package of `stock` identical
// credentials; a purchase atomically decrements stock and is non-refundable.
export const proxies = table("proxies", [
  "id", "host", "port", "username", "password", "country", "trafficGb",
  "stock", "sold", "pricePkr", "active", "notes", "createdAt", "updatedAt",
]);

// One row per proxy a client bought. The credentials and listing details are
// snapshotted at purchase time so the client keeps their copy even if the
// admin later edits or deletes the proxy package.
export const proxyPurchases = table("proxy_purchases", [
  "id", "userId", "proxyId", "host", "port", "country", "trafficGb",
  "credentials", "pricePkr", "status", "createdAt", "updatedAt",
]);
