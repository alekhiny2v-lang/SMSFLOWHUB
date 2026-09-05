"use client";

import { useEffect, useState } from "react";
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
  sellingPkrPrice: string | null;
  active: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  code: "",
  smsbowerCountryId: "",
  providerIds: "",
  markupPercent: "0",
  sellingPkrPrice: "",
  active: true,
  sortOrder: 0,
};

interface SmsbowerCountry {
  code: string;
  smsbowerCountryId: number;
  name: string;
  providerCount: number;
}

interface CheapProvider {
  providerId: number;
  price: number;
  count: number;
}

interface CheapCountry {
  countryCode: string;
  smsbowerCountryId: number;
  providers: CheapProvider[];
}

export default function AdminCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [syncList, setSyncList] = useState<SmsbowerCountry[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [cheapList, setCheapList] = useState<CheapCountry[]>([]);
  const [showCheap, setShowCheap] = useState(false);
  const [cheapLoading, setCheapLoading] = useState(false);
  const [maxPrice, setMaxPrice] = useState("0.034");

  const load = () =>
    apiFetch<Country[]>("/api/admin/countries")
      .then(setCountries)
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
  }, []);

  const loadSync = async () => {
    setSyncLoading(true);
    try {
      const data = await apiFetch<{ countries: SmsbowerCountry[] }>("/api/admin/smsbower/countries");
      setSyncList(data.countries);
      setShowSync(true);
    } catch {
      /* ignore */
    } finally {
      setSyncLoading(false);
    }
  };

  const loadCheap = async () => {
    setCheapLoading(true);
    try {
      const data = await apiFetch<{ results: CheapCountry[] }>(`/api/admin/smsbower/cheap?maxPrice=${maxPrice}`);
      setCheapList(data.results);
      setShowCheap(true);
    } catch {
      /* ignore */
    } finally {
      setCheapLoading(false);
    }
  };

  const importCountry = (c: SmsbowerCountry) => {
    setForm({
      name: c.name,
      code: c.code,
      smsbowerCountryId: String(c.smsbowerCountryId),
      providerIds: "",
      markupPercent: "0",
      sellingPkrPrice: "",
      active: true,
      sortOrder: 0,
    });
    setEditingId(null);
    setShowSync(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      smsbowerCountryId: form.smsbowerCountryId ? Number(form.smsbowerCountryId) : null,
      sellingPkrPrice: form.sellingPkrPrice ? Number(form.sellingPkrPrice) : null,
    };
    if (editingId) {
      await apiFetch(`/api/admin/countries/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/admin/countries", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const edit = (c: Country) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      smsbowerCountryId: c.smsbowerCountryId ? String(c.smsbowerCountryId) : "",
      providerIds: c.providerIds,
      markupPercent: c.markupPercent,
      sellingPkrPrice: c.sellingPkrPrice || "",
      active: c.active,
      sortOrder: c.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this country?")) return;
    await apiFetch(`/api/admin/countries/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Countries"
        description="Control which countries clients can buy, which providers serve them, and the selling price in PKR."
        icon={<span>🌍</span>}
      >
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.001"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max $"
              title="Maximum provider price in USD"
              className="input w-24! py-2! text-xs"
            />
            <button onClick={loadCheap} disabled={cheapLoading} className="btn-ghost py-2!">
              {cheapLoading ? "…" : "💎 Cheap providers"}
            </button>
          </div>
          <button onClick={loadSync} disabled={syncLoading} className="btn-ghost py-2!">
            {syncLoading ? "…" : "⟳ Sync SMSBOWER"}
          </button>
          <button
            onClick={() => {
              setShowSync(false);
              setForm(emptyForm);
              setEditingId(null);
            }}
            className="btn-primary btn-shine py-2!"
          >
            + Add country
          </button>
        </div>
      </PageHero>

      {/* ── Cheap providers ── */}
      {showCheap && (
        <div className="bg-surface/90 border border-emerald-500/25 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-lg">Cheap providers (under ${maxPrice})</h3>
              <p className="text-xs text-muted mt-0.5">{cheapList.length} countries with providers this cheap</p>
            </div>
            <button onClick={() => setShowCheap(false)} className="btn-ghost py-2!">Close</button>
          </div>
          <div className="max-h-96 overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead>
                <tr>
                  <th className="th sticky top-0">Country</th>
                  <th className="th sticky top-0">Providers</th>
                  <th className="th sticky top-0">Price</th>
                  <th className="th sticky top-0">Count</th>
                </tr>
              </thead>
              <tbody>
                {cheapList.map((c) => (
                  <tr key={c.countryCode} className="tr-hover">
                    <td className="td">
                      <span className="flex items-center gap-2">
                        <span className="text-lg leading-none">{getCountryFlag(c.countryCode)}</span>
                        <span className="font-semibold text-white">{c.countryCode.toUpperCase()} · {c.smsbowerCountryId}</span>
                      </span>
                    </td>
                    <td className="td text-muted">{c.providers.map((p) => p.providerId).join(", ")}</td>
                    <td className="td text-emerald-400 font-semibold tabular-nums">{c.providers.map((p) => `$${p.price.toFixed(3)}`).join(", ")}</td>
                    <td className="td tabular-nums">{c.providers.map((p) => p.count).join(", ")}</td>
                  </tr>
                ))}
                {cheapList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="td text-center text-muted py-6">No providers found below ${maxPrice}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sync catalogue ── */}
      {showSync && (
        <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-lg">SMSBOWER catalogue</h3>
              <p className="text-xs text-muted mt-0.5">Pick a country to prefill the form — {syncList.length} available</p>
            </div>
            <button onClick={() => setShowSync(false)} className="btn-ghost py-2!">Close</button>
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
                    <td className="td font-semibold text-white">{c.name}</td>
                    <td className="td uppercase text-muted">{c.code}</td>
                    <td className="td tabular-nums">{c.smsbowerCountryId}</td>
                    <td className="td tabular-nums">{c.providerCount}</td>
                    <td className="td">
                      <button onClick={() => importCountry(c)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition">
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

      {/* ── Add / edit form ── */}
      <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5">
        <h3 className="font-bold text-white text-lg mb-4">
          {editingId ? `Edit country #${editingId}` : "Add country"}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="label">Name</label>
            <input placeholder="e.g. Pakistan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Code</label>
            <input placeholder="e.g. pk" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">SMSBOWER country ID</label>
            <input placeholder="Provider country id" type="number" value={form.smsbowerCountryId} onChange={(e) => setForm({ ...form, smsbowerCountryId: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Provider IDs</label>
            <input placeholder="Comma separated" value={form.providerIds} onChange={(e) => setForm({ ...form, providerIds: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Markup %</label>
            <input placeholder="e.g. 25" type="number" value={form.markupPercent} onChange={(e) => setForm({ ...form, markupPercent: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Selling price (PKR)</label>
            <input placeholder="Empty = auto" type="number" step="0.01" value={form.sellingPkrPrice} onChange={(e) => setForm({ ...form, sellingPkrPrice: e.target.value })} className="input focus:ring-emerald-500/20! focus:border-emerald-500/50!" />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input placeholder="0" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/10 bg-canvas/70 px-4 py-2.5 w-full">
              <input id="country-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded accent-brand" />
              <span className="text-sm text-fg-soft font-semibold">Active for clients</span>
            </label>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <button type="submit" className="btn-primary btn-shine">{editingId ? "Update country" : "Add country"}</button>
            {editingId && (
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="btn-ghost">
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Countries table ── */}
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
        <span className="text-[11px] text-muted font-semibold">{countries.filter((c) => c.active).length} active · {countries.filter((c) => !c.active).length} hidden</span>
      </div>

      {!loaded ? (
        <TableSkeleton rows={6} cols={8} />
      ) : countries.length === 0 ? (
        <EmptyState icon="🌍" title="No countries yet" description="Add one manually or import from the SMSBOWER catalogue." />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr>
                <th className="th">Country</th>
                <th className="th">Code</th>
                <th className="th">SMSBOWER ID</th>
                <th className="th">Selling rate</th>
                <th className="th">Markup</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id} className="tr-hover">
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{getCountryFlag(c.code || c.name)}</span>
                      <span className="font-semibold text-white">{c.name}</span>
                    </span>
                  </td>
                  <td className="td uppercase text-muted">{c.code}</td>
                  <td className="td tabular-nums text-muted">{c.smsbowerCountryId ?? "-"}</td>
                  <td className="td">
                    {c.sellingPkrPrice ? (
                      <span className="text-emerald-400 font-bold tabular-nums">PKR {Number(c.sellingPkrPrice).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted">Auto (markup)</span>
                    )}
                  </td>
                  <td className="td tabular-nums">{c.markupPercent}%</td>
                  <td className="td">
                    <StatusPill status={c.active ? "active" : "inactive"} />
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => edit(c)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition">
                        Edit
                      </button>
                      <button onClick={() => remove(c.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition">
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
    </AdminLayout>
  );
}
