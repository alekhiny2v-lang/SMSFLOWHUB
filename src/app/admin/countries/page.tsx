"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getCountryFlag } from "@/lib/country";

interface Country {
  id: number;
  name: string;
  code: string;
  smsbowerCountryId: number | null;
  providerIds: string;
  markupPercent: string;
  profitPkr: string | null;
  sellingPkrPrice: string | null;
  active: boolean;
  sortOrder: number;
  flag?: string;
}

interface ProviderQuote {
  providerId: number;
  usdPrice: number;
  count: number;
  costPkr: number;
  profitPkr: number;
  pkrPrice: number;
  fixed: boolean;
}

interface CheapCountry {
  smsbowerCountryId: number;
  countryCode: string | null;
  countryName: string | null;
  flag: string;
  providers: ProviderQuote[];
  cheapest: ProviderQuote | null;
  totalStock: number;
}

interface StockResponse {
  smsbowerCountryId: number;
  countryName: string | null;
  countryCode: string | null;
  flag: string;
  usdToPkr: number;
  defaultProfitPkr: number;
  providers: ProviderQuote[];
  totalStock: number;
  fetchedAt: string;
}

interface RateCard {
  id: number;
  countryId: number;
  providerId: number;
  service: string;
  usdPrice: number | null;
  stock: number;
  costPkr: number | null;
  profitPkr: number | null;
  pkrPrice: number | null;
  active: boolean;
}

interface SmsbowerCountry {
  code: string;
  smsbowerCountryId: number;
  name: string;
  providerCount: number;
}

interface RateRow {
  providerId: number;
  live: boolean;
  count: number;
  usdPrice: number;
  costPkr: number;
  profitPkr: number;
  pkrPrice: number;
  savedPrice: number | null;
  savedProfit: number | null;
  active: boolean;
  savedId: number | null;
}

type Tab = "catalogue" | "rates" | "fetch";

const emptyForm = {
  name: "",
  code: "",
  smsbowerCountryId: "",
  providerIds: "",
  markupPercent: "0",
  profitPkr: "7",
  sellingPkrPrice: "",
  active: true,
  sortOrder: 0,
};

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "catalogue", label: "Countries", hint: "Catalogue, flags and profit" },
  { id: "rates", label: "Provider rates", hint: "One tab per country, one rate per provider" },
  { id: "fetch", label: "Stock fetch", hint: "Cheapest live rates from SMSBOWER" },
];

function parseIds(value?: string | null): number[] {
  return String(value || "")
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

function uniqueIds(ids: Array<number | string | undefined | null>): number[] {
  return [...new Set(ids.map((id) => Number(id)).filter((n) => Number.isFinite(n)))];
}

function pkr(value: number | string | null | undefined) {
  const num = Number(value);
  return Number.isFinite(num) ? `PKR ${num.toFixed(0)}` : "—";
}

export default function AdminCountries() {
  const [tab, setTab] = useState<Tab>("catalogue");

  const [countries, setCountries] = useState<Country[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [syncList, setSyncList] = useState<SmsbowerCountry[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // ── Stock fetch (cheapest live rates) ──
  const [cheapList, setCheapList] = useState<CheapCountry[]>([]);
  const [cheapLoading, setCheapLoading] = useState(false);
  const [maxPrice, setMaxPrice] = useState("0.034");
  const [minCount, setMinCount] = useState("1");
  const [sortBy, setSortBy] = useState<"price" | "stock" | "name">("price");
  const [cheapQuery, setCheapQuery] = useState("");
  const [cheapMeta, setCheapMeta] = useState<{ usdToPkr: number; defaultProfitPkr: number; fetchedAt?: string } | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  // ── Provider rates (per country tab) ──
  const [rateCountryId, setRateCountryId] = useState<number | null>(null);
  const [rateRows, setRateRows] = useState<RateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { profitPkr: string; pkrPrice: string; active: boolean }>>({});
  const [rateQuery, setRateQuery] = useState("");
  const [rateStock, setRateStock] = useState<StockResponse | null>(null);
  const [countryProfitDraft, setCountryProfitDraft] = useState("");
  const [providerIdsDraft, setProviderIdsDraft] = useState("");
  const [newProviderId, setNewProviderId] = useState("");

  // ── Pricing settings ──
  const [usdToPkr, setUsdToPkr] = useState("280");
  const [defaultProfit, setDefaultProfit] = useState("7");

  const [toast, setToast] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const notify = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(
    () =>
      apiFetch<Country[]>("/api/admin/countries")
        .then(setCountries)
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [],
  );

  useEffect(() => {
    load();
    apiFetch<{ usdToPkr: number; defaultProfitPkr: number }>("/api/admin/settings")
      .then((data) => {
        setUsdToPkr(String(data.usdToPkr));
        setDefaultProfit(String(data.defaultProfitPkr));
        setForm((prev) => (prev === emptyForm ? { ...prev, profitPkr: String(data.defaultProfitPkr) } : prev));
      })
      .catch(() => {});
  }, [load]);

  const rateCountry = countries.find((c) => c.id === rateCountryId) || null;

  /* ─────────────────────────── Sync catalogue ─────────────────────────── */

  const loadSync = async () => {
    setSyncLoading(true);
    try {
      const data = await apiFetch<{ countries: SmsbowerCountry[] }>("/api/admin/smsbower/countries");
      setSyncList(data.countries);
      setShowSync(true);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setSyncLoading(false);
    }
  };

  const importCountry = (c: SmsbowerCountry) => {
    setForm({
      ...emptyForm,
      name: c.name,
      code: c.code,
      smsbowerCountryId: String(c.smsbowerCountryId),
      profitPkr: defaultProfit,
    });
    setEditingId(null);
    setShowSync(false);
    setTab("catalogue");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ───────────────────────── Country form ───────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      smsbowerCountryId: form.smsbowerCountryId === "" ? null : Number(form.smsbowerCountryId),
      sellingPkrPrice: form.sellingPkrPrice ? Number(form.sellingPkrPrice) : null,
      profitPkr: form.profitPkr === "" ? null : Number(form.profitPkr),
    };
    try {
      if (editingId) {
        await apiFetch(`/api/admin/countries/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        notify("Country updated");
      } else {
        await apiFetch("/api/admin/countries", { method: "POST", body: JSON.stringify(payload) });
        notify("Country added — flag resolved automatically");
      }
      setForm({ ...emptyForm, profitPkr: defaultProfit });
      setEditingId(null);
      load();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const edit = (c: Country) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      smsbowerCountryId: c.smsbowerCountryId === null || c.smsbowerCountryId === undefined ? "" : String(c.smsbowerCountryId),
      providerIds: c.providerIds || "",
      markupPercent: c.markupPercent || "0",
      profitPkr: c.profitPkr ?? defaultProfit,
      sellingPkrPrice: c.sellingPkrPrice || "",
      active: c.active,
      sortOrder: c.sortOrder,
    });
    setTab("catalogue");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this country?")) return;
    await apiFetch(`/api/admin/countries/${id}`, { method: "DELETE" });
    notify("Country deleted");
    load();
  };

  /* ─────────────────────── Pricing settings ─────────────────────── */

  const saveSettings = async () => {
    try {
      const data = await apiFetch<{ usdToPkr: number; defaultProfitPkr: number }>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ usdToPkr: Number(usdToPkr), defaultProfitPkr: Number(defaultProfit) }),
      });
      setUsdToPkr(String(data.usdToPkr));
      setDefaultProfit(String(data.defaultProfitPkr));
      notify("Rates saved — every number keeps this profit by default");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  /* ─────────────────────── Stock fetch tab ─────────────────────── */

  const loadCheap = async () => {
    setCheapLoading(true);
    try {
      const data = await apiFetch<{
        results: CheapCountry[];
        usdToPkr: number;
        defaultProfitPkr: number;
        fetchedAt: string;
      }>(
        `/api/admin/smsbower/cheap?maxPrice=${encodeURIComponent(maxPrice)}&minCount=${encodeURIComponent(
          minCount,
        )}&sort=${sortBy}`,
      );
      setCheapList(data.results);
      setCheapMeta({ usdToPkr: data.usdToPkr, defaultProfitPkr: data.defaultProfitPkr, fetchedAt: data.fetchedAt });
      setUsdToPkr(String(data.usdToPkr));
      setDefaultProfit(String(data.defaultProfitPkr));
      setTab("fetch");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setCheapLoading(false);
    }
  };

  const findExisting = (row: CheapCountry) =>
    countries.find(
      (c) =>
        (Number.isFinite(row.smsbowerCountryId) && Number(c.smsbowerCountryId) === row.smsbowerCountryId) ||
        (row.countryCode && c.code.toLowerCase() === row.countryCode.toLowerCase()),
    ) || null;

  const addCountry = async (row: CheapCountry, onlyProviderId?: number) => {
    const ids = onlyProviderId ? [onlyProviderId] : row.providers.map((p) => p.providerId);
    const key = `${row.smsbowerCountryId}:${ids.join("-")}`;
    const existing = findExisting(row);

    setAddingKey(key);
    try {
      if (existing) {
        const merged = uniqueIds([...parseIds(existing.providerIds), ...ids]);
        await apiFetch(`/api/admin/countries/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            providerIds: merged.join(","),
            smsbowerCountryId: row.smsbowerCountryId,
            profitPkr: existing.profitPkr === null ? Number(defaultProfit) : Number(existing.profitPkr),
          }),
        });
        notify(`${row.countryName || row.smsbowerCountryId}: merged provider${ids.length > 1 ? "s" : ""} ${ids.join(", ")}`);
      } else {
        await apiFetch("/api/admin/countries", {
          method: "POST",
          body: JSON.stringify({
            name: row.countryName || `Country ${row.smsbowerCountryId}`,
            code: row.countryCode || undefined,
            smsbowerCountryId: row.smsbowerCountryId,
            providerIds: ids.join(","),
            profitPkr: Number(defaultProfit),
            active: true,
          }),
        });
        notify(`${row.countryName || row.smsbowerCountryId}: added with provider${ids.length > 1 ? "s" : ""} ${ids.join(", ")}`);
      }
      setAddedKeys((prev) => new Set(prev).add(key));
      await load();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setAddingKey(null);
    }
  };

  const addAllVisible = async () => {
    if (!visibleCheap.length) return;
    if (!confirm(`Add ${visibleCheap.length} countries to the catalogue?`)) return;
    for (const row of visibleCheap) {
      await addCountry(row);
    }
    notify(`Imported ${visibleCheap.length} countries`);
  };

  const visibleCheap = cheapList.filter((c) => {
    const query = cheapQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (c.countryName || "").toLowerCase().includes(query) ||
      (c.countryCode || "").toLowerCase().includes(query) ||
      String(c.smsbowerCountryId).includes(query)
    );
  });

  /* ──────────────────── Provider rates (per country) ──────────────────── */

  const loadRates = useCallback(
    async (countryId: number) => {
      const country = countries.find((c) => c.id === countryId);
      setRateCountryId(countryId);
      setDrafts({});
      if (!country) return;

      setCountryProfitDraft(country.profitPkr ?? defaultProfit);
      setProviderIdsDraft(country.providerIds || "");
      setRatesLoading(true);
      try {
        const [saved, live] = await Promise.all([
          apiFetch<{ rates: RateCard[] }>(`/api/admin/provider-rates?countryId=${countryId}`),
          country.smsbowerCountryId !== null && country.smsbowerCountryId !== undefined
            ? apiFetch<StockResponse>(
                `/api/admin/smsbower/stock?smsbowerCountryId=${country.smsbowerCountryId}&profitPkr=${
                  country.profitPkr ?? ""
                }&markupPercent=${country.markupPercent || ""}`,
              ).catch(() => null)
            : Promise.resolve(null),
        ]);

        setRateStock(live);

        const savedByProvider = new Map(saved.rates.map((r) => [r.providerId, r]));
        const fallbackProfit = Number(country.profitPkr ?? defaultProfit);
        const rows: RateRow[] = [];

        for (const quote of live?.providers ?? []) {
          const card = savedByProvider.get(quote.providerId);
          rows.push({
            providerId: quote.providerId,
            live: true,
            count: quote.count,
            usdPrice: quote.usdPrice,
            costPkr: quote.costPkr,
            profitPkr: card?.profitPkr ?? quote.profitPkr ?? fallbackProfit,
            pkrPrice: card?.pkrPrice ?? quote.pkrPrice,
            savedPrice: card?.pkrPrice ?? null,
            savedProfit: card?.profitPkr ?? null,
            active: card?.active !== false,
            savedId: card?.id ?? null,
          });
        }

        // Providers we saved earlier but SMSBOWER is not listing right now.
        for (const card of saved.rates) {
          if (rows.some((r) => r.providerId === card.providerId)) continue;
          rows.push({
            providerId: card.providerId,
            live: false,
            count: Number(card.stock || 0),
            usdPrice: Number(card.usdPrice || 0),
            costPkr: Number(card.costPkr || 0),
            profitPkr: card.profitPkr ?? fallbackProfit,
            pkrPrice: Number(card.pkrPrice || 0),
            savedPrice: card.pkrPrice ?? null,
            savedProfit: card.profitPkr ?? null,
            active: card.active !== false,
            savedId: card.id,
          });
        }

        rows.sort((a, b) => a.usdPrice - b.usdPrice);
        setRateRows(rows);
      } catch (err) {
        notify((err as Error).message, "error");
      } finally {
        setRatesLoading(false);
      }
    },
    [countries, defaultProfit, notify],
  );

  const draftFor = (row: RateRow) =>
    drafts[row.providerId] ?? {
      profitPkr: String(row.profitPkr),
      pkrPrice: row.savedPrice !== null ? String(row.savedPrice) : "",
      active: row.active,
    };

  const setDraft = (providerId: number, patch: Partial<{ profitPkr: string; pkrPrice: string; active: boolean }>) => {
    setDrafts((prev) => {
      const current = prev[providerId] ?? { profitPkr: "7", pkrPrice: "", active: true };
      return { ...prev, [providerId]: { ...current, ...patch } };
    });
  };

  const effectivePrice = (row: RateRow) => {
    const draft = draftFor(row);
    if (draft.pkrPrice !== "") return Number(draft.pkrPrice);
    const profit = Number(draft.profitPkr);
    return Math.ceil(row.costPkr + (Number.isFinite(profit) ? profit : 0));
  };

  const saveRates = async (only?: number) => {
    if (!rateCountryId) return;
    setRatesSaving(true);
    try {
      const payload = rateRows
        .filter((row) => (only === undefined ? true : row.providerId === only))
        .map((row) => {
          const draft = draftFor(row);
          return {
            providerId: row.providerId,
            usdPrice: row.usdPrice,
            stock: row.count,
            costPkr: row.costPkr,
            profitPkr: draft.profitPkr === "" ? null : Number(draft.profitPkr),
            pkrPrice: draft.pkrPrice === "" ? null : Number(draft.pkrPrice),
            active: draft.active,
          };
        });

      await apiFetch("/api/admin/provider-rates", {
        method: "POST",
        body: JSON.stringify({ countryId: rateCountryId, rates: payload }),
      });

      notify(only === undefined ? `Saved rates for ${rateRows.length} providers` : "Provider rate saved");
      await loadRates(rateCountryId);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setRatesSaving(false);
    }
  };

  const addManualProvider = async () => {
    if (!rateCountryId || !newProviderId.trim()) return;
    const id = Number(newProviderId.trim());
    if (!Number.isFinite(id)) return;
    setRateRows((prev) =>
      prev.some((r) => r.providerId === id)
        ? prev
        : [
            ...prev,
            {
              providerId: id,
              live: false,
              count: 0,
              usdPrice: 0,
              costPkr: 0,
              profitPkr: Number(countryProfitDraft || defaultProfit),
              pkrPrice: 0,
              savedPrice: null,
              savedProfit: null,
              active: true,
              savedId: null,
            },
          ],
    );
    setNewProviderId("");
  };

  const saveCountryProfit = async () => {
    if (!rateCountryId) return;
    try {
      await apiFetch(`/api/admin/countries/${rateCountryId}`, {
        method: "PUT",
        body: JSON.stringify({
          profitPkr: countryProfitDraft === "" ? null : Number(countryProfitDraft),
          providerIds: providerIdsDraft,
        }),
      });
      notify("Country profit + providers saved");
      await load();
      await loadRates(rateCountryId);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const useAllLiveProviders = () => {
    setProviderIdsDraft((rateStock?.providers ?? []).map((p) => p.providerId).join(","));
  };

  const filteredCountries = countries.filter((c) => {
    const query = rateQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      String(c.smsbowerCountryId ?? "").includes(query)
    );
  });

  /** Jump to the provider rates tab, loading the country's live stock. */
  const openRates = (id?: number) => {
    setTab("rates");
    const target = id ?? rateCountryId ?? countries[0]?.id;
    if (target) void loadRates(target);
  };

  /* ──────────────────────────── Render ──────────────────────────── */

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Countries & stock"
        description="Live per-provider stock from SMSBOWER, automatic flags, and a flat PKR profit on every number."
        icon={<span>🌍</span>}
      >
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadCheap} disabled={cheapLoading} className="btn-ghost py-2!">
            {cheapLoading ? "…" : "💎 Fetch cheap rates"}
          </button>
          <button onClick={loadSync} disabled={syncLoading} className="btn-ghost py-2!">
            {syncLoading ? "…" : "⟳ Sync SMSBOWER"}
          </button>
          <button
            onClick={() => {
              setShowSync(false);
              setForm({ ...emptyForm, profitPkr: defaultProfit });
              setEditingId(null);
              setTab("catalogue");
            }}
            className="btn-primary btn-shine py-2!"
          >
            + Add country
          </button>
        </div>
      </PageHero>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 mt-5 p-1 rounded-2xl bg-surface/70 border border-white/10 w-full overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => (item.id === "rates" ? openRates() : setTab(item.id))}
            title={item.hint}
            className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
              tab === item.id
                ? "brand-gradient text-ink shadow-lg shadow-brand/20"
                : "text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Pricing rules strip ── */}
      <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Profit per number (PKR)</p>
          <p className="text-[11px] text-muted mt-0.5">
            Every number sells at provider cost × USD→PKR + profit. Keep it between 6 and 7 PKR.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">USD → PKR</label>
            <input
              type="number"
              step="0.01"
              value={usdToPkr}
              onChange={(e) => setUsdToPkr(e.target.value)}
              className="input w-28! py-2! text-sm"
            />
          </div>
          <div>
            <label className="label">Default profit (PKR)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={defaultProfit}
              onChange={(e) => setDefaultProfit(e.target.value)}
              className="input w-28! py-2! text-sm"
            />
          </div>
          <button onClick={saveSettings} className="btn-ghost py-2!">
            Save rates
          </button>
        </div>
      </div>

      {/* ══════════════════ Tab: catalogue ══════════════════ */}
      {tab === "catalogue" && (
        <>
          {showSync && (
            <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">SMSBOWER catalogue</h3>
                  <p className="text-xs text-muted mt-0.5">Pick a country to prefill the form — {syncList.length} available</p>
                </div>
                <button onClick={() => setShowSync(false)} className="btn-ghost py-2!">
                  Close
                </button>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="th sticky top-0">Name</th>
                      <th className="th sticky top-0">Code</th>
                      <th className="th sticky top-0">SMSBOWER ID</th>
                      <th className="th sticky top-0">FB providers</th>
                      <th className="th sticky top-0">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncList.map((c) => (
                      <tr key={c.code} className="tr-hover">
                        <td className="td font-semibold text-white">
                          <span className="flex items-center gap-2">
                            <span className="text-lg leading-none">{getCountryFlag(c.name || c.code)}</span>
                            {c.name}
                          </span>
                        </td>
                        <td className="td uppercase text-muted">{c.code}</td>
                        <td className="td tabular-nums">{c.smsbowerCountryId}</td>
                        <td className="td tabular-nums">{c.providerCount}</td>
                        <td className="td">
                          <button
                            onClick={() => importCountry(c)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                          >
                            Import →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add / edit form */}
          <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5">
            <h3 className="font-bold text-white text-lg mb-1">
              {editingId ? `Edit country #${editingId}` : "Add country"}
            </h3>
            <p className="text-xs text-muted mb-4">
              Type any country name — the code and flag are resolved automatically.
            </p>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  placeholder="e.g. Pakistan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Code (auto)</label>
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none w-7 text-center">{getCountryFlag(form.code || form.name)}</span>
                  <input
                    placeholder="auto"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="input uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="label">SMSBOWER country ID</label>
                <input
                  placeholder="Provider country id"
                  type="number"
                  value={form.smsbowerCountryId}
                  onChange={(e) => setForm({ ...form, smsbowerCountryId: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Provider IDs</label>
                <input
                  placeholder="Comma separated, e.g. 12,44"
                  value={form.providerIds}
                  onChange={(e) => setForm({ ...form, providerIds: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Profit per number (PKR)</label>
                <input
                  placeholder="7"
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.profitPkr}
                  onChange={(e) => setForm({ ...form, profitPkr: e.target.value })}
                  className="input focus:ring-emerald-500/20! focus:border-emerald-500/50!"
                />
                <p className="text-[11px] text-muted mt-1">6–7 PKR recommended</p>
              </div>
              <div>
                <label className="label">Fixed selling price (PKR)</label>
                <input
                  placeholder="Empty = cost + profit"
                  type="number"
                  step="0.01"
                  value={form.sellingPkrPrice}
                  onChange={(e) => setForm({ ...form, sellingPkrPrice: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Legacy markup %</label>
                <input
                  placeholder="0 = unused"
                  type="number"
                  value={form.markupPercent}
                  onChange={(e) => setForm({ ...form, markupPercent: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/10 bg-canvas/70 px-4 py-2.5 w-full">
                  <input
                    id="country-active"
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded accent-brand"
                  />
                  <span className="text-sm text-fg-soft font-semibold">Active for clients</span>
                </label>
              </div>
              <div className="flex gap-2 md:col-span-2 xl:col-span-4">
                <button type="submit" className="btn-primary btn-shine">
                  {editingId ? "Update country" : "Add country"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...emptyForm, profitPkr: defaultProfit });
                      setEditingId(null);
                    }}
                    className="btn-ghost"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Catalogue table */}
          <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
            <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🗺️</span>
              Catalogue
              {loaded && (
                <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5 tabular-nums">
                  {countries.length}
                </span>
              )}
            </h2>
            <span className="text-[11px] text-muted font-semibold">
              {countries.filter((c) => c.active).length} active · {countries.filter((c) => !c.active).length} hidden
            </span>
          </div>

          {!loaded ? (
            <TableSkeleton rows={6} cols={8} />
          ) : countries.length === 0 ? (
            <EmptyState
              icon="🌍"
              title="No countries yet"
              description="Add one manually, import from the SMSBOWER catalogue, or fetch the cheapest live rates."
            />
          ) : (
            <TableCard>
              <table className="w-full text-left min-w-[980px]">
                <thead>
                  <tr>
                    <th className="th">Country</th>
                    <th className="th">Code</th>
                    <th className="th">SMSBOWER ID</th>
                    <th className="th">Providers</th>
                    <th className="th">Profit</th>
                    <th className="th">Selling rate</th>
                    <th className="th">Status</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((c) => (
                    <tr key={c.id} className="tr-hover">
                      <td className="td">
                        <span className="flex items-center gap-2.5">
                          <span className="text-xl leading-none">{c.flag || getCountryFlag(c.code || c.name)}</span>
                          <span className="font-semibold text-white">{c.name}</span>
                        </span>
                      </td>
                      <td className="td uppercase text-muted">{c.code}</td>
                      <td className="td tabular-nums text-muted">{c.smsbowerCountryId ?? "-"}</td>
                      <td className="td tabular-nums text-muted">
                        {parseIds(c.providerIds).length ? parseIds(c.providerIds).join(", ") : "all"}
                      </td>
                      <td className="td tabular-nums">
                        {c.profitPkr !== null && c.profitPkr !== undefined ? (
                          <span className="text-emerald-400 font-semibold">+{Number(c.profitPkr)} PKR</span>
                        ) : Number(c.markupPercent) > 0 ? (
                          <span className="text-muted" title="Legacy percentage markup — set a flat profit to switch">
                            {Number(c.markupPercent)}% markup
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">+{defaultProfit} PKR</span>
                        )}
                      </td>
                      <td className="td">
                        {c.sellingPkrPrice ? (
                          <span className="text-emerald-400 font-bold tabular-nums">
                            {pkr(c.sellingPkrPrice)}
                          </span>
                        ) : (
                          <span className="text-muted">cost + profit</span>
                        )}
                      </td>
                      <td className="td">
                        <StatusPill status={c.active ? "active" : "inactive"} />
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-1.5">
                          <button
                            onClick={() => openRates(c.id)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition"
                          >
                            Rates
                          </button>
                          <button
                            onClick={() => edit(c)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(c.id)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition"
                          >
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}
        </>
      )}

      {/* ══════════════════ Tab: provider rates ══════════════════ */}
      {tab === "rates" && (
        <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="font-bold text-white text-lg">Provider rates</h3>
              <p className="text-xs text-muted mt-0.5">
                One tab per country. Every provider keeps its own live stock, cost and selling price.
              </p>
            </div>
            {rateCountry && (
              <button
                onClick={() => void loadRates(rateCountry.id)}
                disabled={ratesLoading}
                className="btn-ghost py-2!"
              >
                {ratesLoading ? "Fetching…" : "⟳ Refresh live stock"}
              </button>
            )}
          </div>

          <input
            value={rateQuery}
            onChange={(e) => setRateQuery(e.target.value)}
            placeholder="Search a country…"
            className="input w-full md:w-72 mb-3"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {filteredCountries.map((c) => (
              <button
                key={c.id}
                onClick={() => void loadRates(c.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  rateCountryId === c.id
                    ? "bg-brand/15 border-brand/40 text-brand-soft"
                    : "bg-white/5 border-white/10 text-muted hover:text-white hover:border-white/20"
                }`}
              >
                <span className="text-base leading-none">{c.flag || getCountryFlag(c.code || c.name)}</span>
                <span>{c.name}</span>
                <span className="tabular-nums opacity-70">{c.smsbowerCountryId ?? "—"}</span>
              </button>
            ))}
            {filteredCountries.length === 0 && <p className="text-sm text-muted px-1">No country matches “{rateQuery}”.</p>}
          </div>

          {!rateCountry ? (
            <EmptyState icon="🌍" title="Pick a country" description="Choose a country tab to see its providers." />
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-end gap-3 mb-4 p-4 rounded-xl bg-canvas/60 border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg leading-none">{rateCountry.flag || getCountryFlag(rateCountry.code || rateCountry.name)}</span>
                    {rateCountry.name}
                    <span className="text-[11px] text-muted font-semibold uppercase">{rateCountry.code}</span>
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    SMSBOWER ID {rateCountry.smsbowerCountryId ?? "—"} · live providers {rateStock?.providers.length ?? 0} ·
                    stock {rateStock?.totalStock ?? 0}
                    {rateStock?.fetchedAt ? ` · fetched ${new Date(rateStock.fetchedAt).toLocaleTimeString()}` : ""}
                  </p>
                </div>
                <div className="flex-1" />
                <div>
                  <label className="label">Country profit (PKR)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={countryProfitDraft}
                    onChange={(e) => setCountryProfitDraft(e.target.value)}
                    className="input w-28! py-2! text-sm"
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <label className="label">Providers used for this country</label>
                  <div className="flex gap-2">
                    <input
                      value={providerIdsDraft}
                      onChange={(e) => setProviderIdsDraft(e.target.value)}
                      placeholder="empty = every provider"
                      className="input py-2! text-sm"
                    />
                    <button onClick={useAllLiveProviders} className="btn-ghost py-2! shrink-0">
                      All live
                    </button>
                  </div>
                </div>
                <button onClick={saveCountryProfit} className="btn-primary py-2!">
                  Save
                </button>
              </div>

              {ratesLoading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : rateRows.length === 0 ? (
                <EmptyState
                  icon="📦"
                  title="No providers fetched yet"
                  description="Hit “Refresh live stock” to pull every provider id, price and stock for this country."
                />
              ) : (
                <>
                  <div className="max-h-[460px] overflow-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-sm min-w-[860px]">
                      <thead>
                        <tr>
                          <th className="th sticky top-0">Provider</th>
                          <th className="th sticky top-0">Live stock</th>
                          <th className="th sticky top-0">Cost (USD)</th>
                          <th className="th sticky top-0">Cost (PKR)</th>
                          <th className="th sticky top-0">Profit (PKR)</th>
                          <th className="th sticky top-0">Selling (PKR)</th>
                          <th className="th sticky top-0">Use</th>
                          <th className="th sticky top-0">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateRows.map((row) => {
                          const draft = draftFor(row);
                          const price = effectivePrice(row);
                          const margin = price - row.costPkr;
                          return (
                            <tr key={row.providerId} className={`tr-hover ${draft.active ? "" : "opacity-55"}`}>
                              <td className="td">
                                <span className="font-bold text-white tabular-nums">#{row.providerId}</span>
                                {row.live ? (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                                    live
                                  </span>
                                ) : (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                    saved
                                  </span>
                                )}
                              </td>
                              <td className="td tabular-nums">
                                <span className={row.count > 0 ? "text-emerald-400 font-semibold" : "text-red-400"}>
                                  {row.count}
                                </span>
                              </td>
                              <td className="td tabular-nums text-muted">${row.usdPrice.toFixed(4)}</td>
                              <td className="td tabular-nums">{pkr(row.costPkr)}</td>
                              <td className="td">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={draft.profitPkr}
                                  onChange={(e) => setDraft(row.providerId, { profitPkr: e.target.value })}
                                  className="input w-20! py-1.5! text-xs"
                                />
                              </td>
                              <td className="td">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={draft.pkrPrice === "" ? price : draft.pkrPrice}
                                    onChange={(e) => setDraft(row.providerId, { pkrPrice: e.target.value })}
                                    className="input w-24! py-1.5! text-xs"
                                  />
                                  <span className={`text-[11px] font-semibold tabular-nums ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    +{margin.toFixed(0)}
                                  </span>
                                </div>
                              </td>
                              <td className="td">
                                <input
                                  type="checkbox"
                                  checked={draft.active}
                                  onChange={(e) => setDraft(row.providerId, { active: e.target.checked })}
                                  className="w-4 h-4 rounded accent-brand"
                                />
                              </td>
                              <td className="td">
                                <button
                                  onClick={() => void saveRates(row.providerId)}
                                  disabled={ratesSaving}
                                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                                >
                                  Save
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <input
                      value={newProviderId}
                      onChange={(e) => setNewProviderId(e.target.value)}
                      placeholder="Add provider id manually"
                      className="input w-52! py-2! text-sm"
                    />
                    <button onClick={addManualProvider} className="btn-ghost py-2!">
                      + Add provider
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => void saveRates()} disabled={ratesSaving} className="btn-primary btn-shine">
                      {ratesSaving ? "Saving…" : `Save all ${rateRows.length} rates`}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2">
                    Leaving “Selling” empty keeps the price automatic: provider cost + profit. A saved price overrides it
                    for that provider only.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ Tab: stock fetch ══════════════════ */}
      {tab === "fetch" && (
        <div className="bg-surface/90 border border-emerald-500/25 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="font-bold text-white text-lg">Cheapest live rates</h3>
              <p className="text-xs text-muted mt-0.5">
                Real stock straight from SMSBOWER, per provider id. Hit <span className="text-brand-soft font-semibold">Add</span> to
                import the country id + providers into your catalogue.
              </p>
            </div>
            <span className="text-[11px] text-muted font-semibold">
              {cheapMeta ? `${cheapList.length} countries · $${cheapMeta.usdToPkr ? "" : ""}1 = ${cheapMeta.usdToPkr} PKR` : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div>
              <label className="label">Max provider price ($)</label>
              <input
                type="number"
                step="0.001"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input w-32! py-2! text-sm"
              />
            </div>
            <div>
              <label className="label">Min stock</label>
              <input
                type="number"
                step="1"
                min="0"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                className="input w-24! py-2! text-sm"
              />
            </div>
            <div>
              <label className="label">Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "price" | "stock" | "name")}
                className="input w-40! py-2! text-sm"
              >
                <option value="price">Cheapest first</option>
                <option value="stock">Most stock</option>
                <option value="name">Country A → Z</option>
              </select>
            </div>
            <button onClick={loadCheap} disabled={cheapLoading} className="btn-primary py-2!">
              {cheapLoading ? "Fetching…" : "Fetch live stock"}
            </button>
            {cheapList.length > 0 && (
              <button onClick={addAllVisible} className="btn-ghost py-2!">
                ＋ Add all visible ({visibleCheap.length})
              </button>
            )}
            <div className="flex-1" />
            <input
              value={cheapQuery}
              onChange={(e) => setCheapQuery(e.target.value)}
              placeholder="Filter country…"
              className="input w-full md:w-56 py-2! text-sm"
            />
          </div>

          <div className="max-h-[520px] overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm min-w-[820px]">
              <thead>
                <tr>
                  <th className="th sticky top-0">Country</th>
                  <th className="th sticky top-0">Providers (id · price · stock)</th>
                  <th className="th sticky top-0">Cheapest</th>
                  <th className="th sticky top-0">Your price</th>
                  <th className="th sticky top-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleCheap.map((c) => {
                  const existing = findExisting(c);
                  const key = `${c.smsbowerCountryId}:${c.providers.map((p) => p.providerId).join("-")}`;
                  const busy = addingKey === key;
                  const done = addedKeys.has(key) || (existing && parseIds(existing.providerIds).length > 0);
                  return (
                    <tr key={c.smsbowerCountryId} className="tr-hover">
                      <td className="td">
                        <span className="flex items-center gap-2">
                          <span className="text-lg leading-none">{c.flag || getCountryFlag(c.countryName || c.countryCode)}</span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-white truncate">
                              {c.countryName || `Country ${c.smsbowerCountryId}`}
                            </span>
                            <span className="block text-[11px] text-muted uppercase tracking-wider">
                              {c.countryCode || "—"} · id {c.smsbowerCountryId}
                              {existing ? ` · in catalogue #${existing.id}` : ""}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="td">
                        <span className="flex flex-wrap gap-1.5">
                          {c.providers.map((p) => (
                            <span
                              key={p.providerId}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                              title={`Provider ${p.providerId}: $${p.usdPrice} per number, ${p.count} in stock`}
                            >
                              <span className="text-white tabular-nums">#{p.providerId}</span>
                              <span className="text-brand-soft tabular-nums">${p.usdPrice.toFixed(3)}</span>
                              <span className={p.count > 0 ? "text-emerald-400 tabular-nums" : "text-red-400 tabular-nums"}>
                                {p.count}
                              </span>
                              <button
                                onClick={() => void addCountry(c, p.providerId)}
                                disabled={busy}
                                title={`Add only provider ${p.providerId}`}
                                className="ml-0.5 w-4 h-4 grid place-items-center rounded bg-white/10 hover:bg-brand text-muted hover:text-ink text-[11px] font-bold leading-none transition disabled:opacity-40"
                              >
                                +
                              </button>
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="td tabular-nums text-emerald-400 font-semibold">
                        ${c.cheapest ? c.cheapest.usdPrice.toFixed(3) : "—"}
                      </td>
                      <td className="td tabular-nums font-bold text-white">
                        {c.cheapest ? pkr(c.cheapest.pkrPrice) : "—"}
                        <span className="block text-[10px] text-muted font-semibold">
                          cost {c.cheapest ? pkr(c.cheapest.costPkr) : "—"} + {c.cheapest?.profitPkr ?? defaultProfit} profit
                        </span>
                      </td>
                      <td className="td">
                        <button
                          onClick={() => void addCountry(c)}
                          disabled={busy}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${
                            done
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
                              : "brand-gradient text-ink border-transparent hover:brightness-110"
                          }`}
                        >
                          {busy ? "Adding…" : done ? "✓ Added" : "＋ Add"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visibleCheap.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td text-center text-muted py-8">
                      {cheapLoading
                        ? "Fetching live stock…"
                        : "Nothing fetched yet — set a max price and hit “Fetch live stock”."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-semibold shadow-2xl animate-fade-in ${
            toast.tone === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
}
