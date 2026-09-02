"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { apiFetch } from "@/lib/api";

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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [syncList, setSyncList] = useState<SmsbowerCountry[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [cheapList, setCheapList] = useState<CheapCountry[]>([]);
  const [showCheap, setShowCheap] = useState(false);
  const [maxPrice, setMaxPrice] = useState("0.034");

  const load = () => apiFetch<Country[]>("/api/admin/countries").then(setCountries);

  useEffect(() => {
    load();
  }, []);

  const loadSync = async () => {
    const data = await apiFetch<{ countries: SmsbowerCountry[] }>("/api/admin/smsbower/countries");
    setSyncList(data.countries);
    setShowSync(true);
  };

  const loadCheap = async () => {
    const data = await apiFetch<{ results: CheapCountry[] }>(`/api/admin/smsbower/cheap?maxPrice=${maxPrice}`);
    setCheapList(data.results);
    setShowCheap(true);
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
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this country?")) return;
    await apiFetch(`/api/admin/countries/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Countries</h1>
          <p className="text-slate-400 text-sm mt-1">Manage countries, providers, and selling rates</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.001"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max price"
              className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={loadCheap}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl font-semibold text-sm transition"
            >
              Cheap Providers
            </button>
          </div>
          <button
            onClick={loadSync}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 px-4 py-2 rounded-xl font-semibold text-sm transition"
          >
            Sync from SMSBOWER
          </button>
          <button
            onClick={() => setShowSync(false)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition"
          >
            + Add Country
          </button>
        </div>
      </div>

      {showCheap && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">Cheap Providers (price &lt; {maxPrice})</h3>
            <button onClick={() => setShowCheap(false)} className="text-slate-400 hover:text-white text-sm">Close</button>
          </div>
          <div className="max-h-96 overflow-auto">
            <TableCard>
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Country ID</th>
                    <th className="px-4 py-3">Providers</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Count</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {cheapList.map((c) => (
                    <tr key={c.countryCode} className="border-t border-white/5">
                      <td className="px-4 py-3 font-medium">{c.smsbowerCountryId}</td>
                      <td className="px-4 py-3">{c.providers.map((p) => p.providerId).join(", ")}</td>
                      <td className="px-4 py-3">{c.providers.map((p) => `$${p.price.toFixed(3)}`).join(", ")}</td>
                      <td className="px-4 py-3">{c.providers.map((p) => p.count).join(", ")}</td>
                    </tr>
                  ))}
                  {cheapList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-500">No providers found below ${maxPrice}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          </div>
        </div>
      )}

      {showSync && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">SMSBOWER Countries</h3>
            <button onClick={() => setShowSync(false)} className="text-slate-400 hover:text-white text-sm">Close</button>
          </div>
          <div className="max-h-80 overflow-auto">
            <TableCard>
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">SMSBOWER ID</th>
                    <th className="px-4 py-3">FB Providers</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {syncList.map((c) => (
                    <tr key={c.code} className="border-t border-white/5">
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3 uppercase">{c.code}</td>
                      <td className="px-4 py-3">{c.smsbowerCountryId}</td>
                      <td className="px-4 py-3">{c.providerCount}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => importCountry(c)} className="text-blue-400 hover:text-blue-300 font-medium">Import</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-6">
        <h3 className="font-bold text-white text-lg mb-4">{editingId ? "Edit Country" : "Add Country"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Code (e.g. us)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="SMSBOWER Country ID" type="number" value={form.smsbowerCountryId} onChange={(e) => setForm({ ...form, smsbowerCountryId: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Provider IDs (comma separated)" value={form.providerIds} onChange={(e) => setForm({ ...form, providerIds: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Markup %" type="number" value={form.markupPercent} onChange={(e) => setForm({ ...form, markupPercent: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Selling Price (PKR)" type="number" value={form.sellingPkrPrice} onChange={(e) => setForm({ ...form, sellingPkrPrice: e.target.value })} className="bg-slate-950/50 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input placeholder="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-3">
            <input id="active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-slate-950/50 text-blue-600" />
            <label htmlFor="active" className="text-slate-300 text-sm">Active</label>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition">
              {editingId ? "Update Country" : "Add Country"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm transition">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <TableCard>
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">SMSBOWER ID</th>
              <th className="px-5 py-4">Selling Rate</th>
              <th className="px-5 py-4">Markup</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {countries.map((c) => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{c.id}</td>
                <td className="px-5 py-4 font-medium text-white">{c.name}</td>
                <td className="px-5 py-4 uppercase">{c.code}</td>
                <td className="px-5 py-4">{c.smsbowerCountryId ?? "-"}</td>
                <td className="px-5 py-4">
                  {c.sellingPkrPrice ? (
                    <span className="text-emerald-400 font-bold">PKR {Number(c.sellingPkrPrice).toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-500">Auto</span>
                  )}
                </td>
                <td className="px-5 py-4">{c.markupPercent}%</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4 space-x-3">
                  <button onClick={() => edit(c)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </AdminLayout>
  );
}
