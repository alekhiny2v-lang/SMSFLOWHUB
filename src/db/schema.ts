export type Table = { collection: string; [key: string]: any };

function table(name: string, fields: string[]): Table {
  const result: Table = { collection: name };
  for (const field of fields) result[field] = { table: name, field };
  return result;
}

export const users = table("users", ["id", "username", "password", "role", "balance", "status", "createdAt", "updatedAt"]);
export const countries = table("countries", ["id", "name", "code", "smsbowerCountryId", "providerIds", "markupPercent", "sellingPkrPrice", "active", "sortOrder", "createdAt", "updatedAt"]);
export const transactions = table("transactions", ["id", "userId", "type", "amount", "status", "method", "reference", "notes", "createdById", "createdAt", "updatedAt"]);
export const activations = table("activations", ["id", "userId", "countryId", "smsbowerActivationId", "service", "phoneNumber", "cost", "salePrice", "status", "smsCode", "smsText", "providerIds", "retryCount", "expiresAt", "createdAt", "updatedAt"]);
export const settings = table("settings", ["key", "value", "updatedAt"]);
export const userCountryRates = table("user_country_rates", ["id", "userId", "countryId", "pkrPrice", "createdAt", "updatedAt"]);
export const paymentMethods = table("payment_methods", ["id", "userId", "type", "accountName", "accountNumber", "notes", "isDefault", "createdAt", "updatedAt"]);
export const depositAccounts = table("deposit_accounts", ["id", "type", "accountName", "accountNumber", "instructions", "active", "sortOrder", "createdAt", "updatedAt"]);
