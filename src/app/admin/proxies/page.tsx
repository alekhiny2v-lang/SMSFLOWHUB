"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatCard, StatCardSkeleton, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { buildCredentials, formatTraffic, parseBulkProxyLines, type ParsedProxyLine } from "@/lib/proxy";

interface ProxyAccount {
  id: number;
  host: string;
  port: string;
  username: string;
  password: string;
  country: string;
  trafficGb: number;
  stock: number;
  sold: number;
  pricePkr: number;
  active: boolean;
  notes: string;
  createdAt: string;
}

const emptyForm = {
  host: "",
  port: "",
  username: "",
  password: "",
  country: "",
  trafficAmount: "",
  trafficUnit: "GB" as "GB" | "MB",
  stock: 1,
  pricePkr: 150,
  active: true,
  notes: "",
};

const DEFAULT_PRICE = 150;

export default function AdminProxies() {
  const [proxies, setProxies] = useState<ProxyAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = () =>
    apiFetch<ProxyAccount[]>("/api/admin/proxies")
      .then(setProxies)
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
  }, []);

  const trafficGbFromForm = () => {
    const amount = Number(form.trafficAmount) || 0;
    return form.trafficUnit === "GB" ? amount : amount / 1024;
  };

  const submitProxy = async (line: ParsedProxyLine) => {
    return apiFetch("/api/admin/proxies", {
      method: "POST",
      body: JSON.stringify({
        host: line.host,
        port: line.port,
        username: line.username,
        password: line.password,
        country: form.country,
        trafficGb: trafficGbFromForm(),
        stock: form.stock,
        pricePkr: form.pricePkr,
        active: form.active,
        notes: form.notes,
      }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (editingId) {
        await apiFetch(`/api/admin/proxies/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            host: form.host,
            port: form.port,
            username: form.username,
            password: form.password,
            country: form.country,
            trafficGb: trafficGbFromForm(),
            stock: form.stock,
            pricePkr: form.pricePkr,
            active: form.active,
            notes: form.notes,
          }),
        });
        setMessage("Proxy updated.");
      } else {
        await submitProxy({
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
        });
        setMessage("Proxy added to stock.");
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBulk = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { valid, invalid } = parseBulkProxyLines(bulkText);
      if (valid.length === 0) {
        setMessage("Paste at least one line as host:port:username:password");
        return;
      }
      for (const line of valid) {
        await submitProxy(line);
      }
      setBulkText("");
      setMessage(
        `Added ${valid.length} proxy${valid.length === 1 ? "" : "es"} to stock${invalid.length ? ` · ${invalid.length} invalid line${invalid.length === 1 ? "" : "s"} skipped` : ""}.`,
      );
      load();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (p: ProxyAccount) => {
    setEditingId(p.id);
    setForm({
      host: p.host,
      port: p.port,
      username: p.username,
      password: p.password,
      country: p.country,
      trafficAmount: p.trafficGb >= 1 ? String(p.trafficGb) : p.trafficGb > 0 ? String(Math.round(p.trafficGb * 1024)) : "",
      trafficUnit: p.trafficGb >= 1 ? "GB" : "MB",
      stock: p.stock,
      pricePkr: p.pricePkr,
      active: p.active,
      notes: p.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this proxy? Clients who already bought it keep their credentials.")) return;
    await apiFetch(`/api/admin/proxies/${id}`, { method: "DELETE" });
    load();
  };

  const copyCredentials = async (p: ProxyAccount) => {
    try {
      await navigator.clipboard.writeText(buildCredentials(p.host, p.port, p.username, p.password));
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeProxies = proxies.filter((p) => p.active);
  const totalStock = activeProxies.reduce((s, p) => s + Number(p.stock || 0), 0);
  const totalSold = proxies.reduce((s, p) => s + Number(p.sold || 0), 0);
  const revenue = proxies.reduce((s, p) => s + Number(p.sold || 0) * Number(p.pricePkr || 0), 0);

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Proxy Store"
        description="Stock proxy accounts (host:port:username:password) with traffic and price. Clients buy them for a flat PKR price — sales are final, no refunds."
        icon={<span>🛡️</span>}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        {!loaded ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Packages listed" value={activeProxies.length} hint="active proxy types" icon="📦" tone="brand" />
            <StatCard label="Stock in hand" value={totalStock} hint="credentials available to sell" icon="🛡️" tone="emerald" />
            <StatCard label="Sold" value={totalSold} hint="all-time deliveries" icon="🧾" tone="info" />
            <StatCard label="Proxy revenue" value={`PKR ${revenue.toFixed(2)}`} hint="non-refundable sales" icon="💰" tone="white" />
          </>
        )}
      </div>

      {/* ── Add / edit form ── */}
      <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5">
        <h3 className="font-bold text-white text-lg mb-1">{editingId ? `Edit proxy #${editingId}` : "Add proxy to stock"}</h3>
        <p className="text-xs text-muted mb-4">Format used by clients: host:port:username:password — e.g. change4.owlproxy.com:7778:user_custom_zone:5536244</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="label">Host</label>
            <input placeholder="change4.owlproxy.com" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Port</label>
            <input placeholder="7778" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Username</label>
            <input placeholder="jatM3rAajT70_custom_zone…" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input placeholder="5536244" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Country / zone (optional)</label>
            <input placeholder="e.g. US" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Traffic</label>
            <div className="flex gap-2">
              <input placeholder="1" type="number" min="0" step="any" value={form.trafficAmount} onChange={(e) => setForm({ ...form, trafficAmount: e.target.value })} className="input" />
              <select value={form.trafficUnit} onChange={(e) => setForm({ ...form, trafficUnit: e.target.value as "GB" | "MB" })} className="input w-24">
                <option value="GB">GB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Stock (accounts)</label>
            <input placeholder="1" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Price (PKR)</label>
            <input placeholder="150" type="number" min="0" value={form.pricePkr} onChange={(e) => setForm({ ...form, pricePkr: Number(e.target.value) })} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes (optional)</label>
            <input placeholder="e.g. US SOCKS5, 90-minute session" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/10 bg-canvas/70 px-4 py-2.5 w-full">
              <input id="proxy-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded accent-brand" />
              <span className="text-sm text-fg-soft font-semibold">Visible to clients</span>
            </label>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4 items-center flex-wrap">
            <button type="submit" disabled={busy} className="btn-primary btn-shine">
              {editingId ? "Update proxy" : "Add proxy"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="btn-ghost">
                Cancel edit
              </button>
            )}
            {message && <span className="text-xs font-bold text-brand-soft">{message}</span>}
          </div>
        </form>

        {/* ── Bulk add ── */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h4 className="font-bold text-white text-sm mb-1">Bulk add</h4>
          <p className="text-xs text-muted mb-3">
            Paste one proxy per line as host:port:username:password. Each line is added with the country, traffic, stock, price and visibility currently set in the form above.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"change4.owlproxy.com:7778:jatM3rAajT70_custom_zone_US:5536244\nchange4.owlproxy.com:7778:user_custom_zone_UK:8845123"}
            className="input min-h-[96px] font-mono text-xs leading-relaxed"
          />
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button type="button" onClick={handleBulk} disabled={busy} className="btn-primary btn-shine">
              Add {bulkText.trim() ? `(${bulkText.trim().split(/\r?\n/).filter((l) => l.trim()).length} lines)` : "bulk"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stock table ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🛡️</span>
          Proxy Stock
          {loaded && (
            <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5 tabular-nums">
              {proxies.length}
            </span>
          )}
        </h2>
        <span className="text-[11px] text-muted font-semibold">Default price: PKR {DEFAULT_PRICE} · sales are final</span>
      </div>

      {!loaded ? (
        <TableSkeleton rows={4} cols={8} />
      ) : proxies.length === 0 ? (
        <EmptyState icon="🛡️" title="No proxies in stock" description="Add your first proxy account and clients will see it in the proxy store." />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr>
                <th className="th">Proxy</th>
                <th className="th">Country</th>
                <th className="th">Traffic</th>
                <th className="th">Credentials</th>
                <th className="th">Stock</th>
                <th className="th">Sold</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proxies.map((p) => (
                <tr key={p.id} className="tr-hover">
                  <td className="td">
                    <span className="font-mono text-white font-semibold">{p.host}:{p.port}</span>
                    {p.notes && <span className="block text-[11px] text-muted max-w-[200px] truncate">{p.notes}</span>}
                  </td>
                  <td className="td">{p.country || "-"}</td>
                  <td className="td">{formatTraffic(p.trafficGb)}</td>
                  <td className="td">
                    <span className="inline-flex items-center gap-2 max-w-[300px]">
                      <span className="font-mono text-[11px] text-fg-soft truncate">
                        {p.username}:{revealed.has(p.id) ? p.password : "••••••••"}
                      </span>
                      <button
                        onClick={() => toggleReveal(p.id)}
                        className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 transition"
                        title={revealed.has(p.id) ? "Hide password" : "Show password"}
                      >
                        {revealed.has(p.id) ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => copyCredentials(p)}
                        className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                      >
                        {copiedId === p.id ? "Copied ✓" : "Copy"}
                      </button>
                    </span>
                  </td>
                  <td className="td">
                    <span className={`font-bold tabular-nums ${Number(p.stock) > 0 ? "text-emerald-400" : "text-red-400"}`}>{Number(p.stock)}</span>
                  </td>
                  <td className="td text-muted tabular-nums">{Number(p.sold)}</td>
                  <td className="td font-bold text-white tabular-nums">PKR {Number(p.pricePkr).toFixed(2)}</td>
                  <td className="td">
                    <StatusPill status={p.active ? "active" : "inactive"} />
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => edit(p)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition">
                        Edit
                      </button>
                      <button onClick={() => remove(p.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition">
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
