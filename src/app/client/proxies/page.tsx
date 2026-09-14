"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatCard, StatCardSkeleton, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatTraffic } from "@/lib/proxy";
import { getCountryFlag } from "@/lib/country";

interface ProxyOffer {
  id: number;
  host: string;
  port: string;
  country: string;
  trafficGb: number;
  stock: number;
  pricePkr: number;
}

interface ProxyPurchase {
  id: number;
  host: string;
  port: string;
  country: string;
  trafficGb: number;
  credentials: string;
  pricePkr: string;
  createdAt: string;
}

export default function ClientProxies() {
  const [offers, setOffers] = useState<ProxyOffer[]>([]);
  const [purchases, setPurchases] = useState<ProxyPurchase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<{ balance: string } | null>(null);
  const [buying, setBuying] = useState<ProxyOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<{ host: string; port: string; credentials: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    apiFetch<ProxyOffer[]>("/api/client/proxies").then(setOffers).catch(() => {});
    apiFetch<ProxyPurchase[]>("/api/client/proxies/purchases").then(setPurchases).catch(() => {});
    apiFetch<{ balance: string }>("/api/auth/me")
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  const balance = Number(me?.balance || 0);

  const confirmBuy = async () => {
    if (!buying) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ host: string; port: string; credentials: string }>("/api/client/proxies/buy", {
        method: "POST",
        body: JSON.stringify({ proxyId: buying.id }),
      });
      setDelivered(result);
      setBuying(null);
      load();
      setMe((prev) => (prev ? { balance: String(balance - buying.pricePkr) } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const totalStock = offers.reduce((s, o) => s + o.stock, 0);
  const totalSpent = purchases.reduce((s, p) => s + Number(p.pricePkr || 0), 0);

  return (
    <ClientLayout>
      {/* ── Hero ── */}
      <PageHero
        eyebrow="Proxy Store"
        title="Buy Proxy Accounts"
        description="Premium proxies with credentials delivered instantly after payment. Every sale is final and non-refundable — credentials cannot be returned once shown."
        icon={<span>🛡️</span>}
      >
        <span className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-2 text-[11px] font-bold text-red-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Non-refundable
        </span>
      </PageHero>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        {!loaded ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Wallet balance" value={`PKR ${balance.toFixed(2)}`} hint="available to spend" icon="💰" tone="emerald" />
            <StatCard label="Proxies available" value={totalStock} hint={`${offers.length} active type${offers.length === 1 ? "" : "s"}`} icon="📦" tone="brand" />
            <StatCard label="My proxies" value={purchases.length} hint={`PKR ${totalSpent.toFixed(2)} spent`} icon="🧾" tone="info" />
          </>
        )}
      </div>

      {/* ── Catalog ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🛒</span>
          Available Proxies
          {loaded && (
            <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5 tabular-nums">
              {offers.length}
            </span>
          )}
        </h2>
        <span className="text-[11px] text-muted font-semibold">Flat price per proxy account · no refunds</span>
      </div>

      {!loaded ? (
        <TableSkeleton rows={3} cols={4} />
      ) : offers.length === 0 ? (
        <EmptyState icon="🛡️" title="No proxies available" description="Check back soon — the admin adds fresh proxy stock here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((o) => {
            const affordable = balance >= o.pricePkr;
            return (
              <div key={o.id} className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 card-hover relative overflow-hidden">
                <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand/10 blur-2xl" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-white font-bold truncate" title={`${o.host}:${o.port}`}>
                        {o.host}:{o.port}
                      </p>
                      <p className="text-[11px] text-muted mt-1 flex items-center gap-1.5">
                        <span className="text-sm leading-none">{o.country ? getCountryFlag(o.country) : "🌐"}</span>
                        {o.country || "Any country"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold border ${o.stock > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-red-500/10 text-red-400 border-red-500/25"}`}>
                      {o.stock > 0 ? `${o.stock} in stock` : "Sold out"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl bg-canvas/50 border border-white/5 px-3.5 py-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Traffic</p>
                      <p className="text-sm font-bold text-white mt-0.5">{formatTraffic(o.trafficGb)}</p>
                    </div>
                    <div className="rounded-xl bg-canvas/50 border border-white/5 px-3.5 py-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Price</p>
                      <p className="text-sm font-bold text-brand mt-0.5 tabular-nums">PKR {o.pricePkr.toFixed(2)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setError(null);
                      setBuying(o);
                    }}
                    disabled={o.stock < 1 || !affordable}
                    className="relative mt-4 w-full brand-gradient text-ink rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-brand/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none btn-shine"
                  >
                    {o.stock < 1 ? "Sold out" : !affordable ? "Insufficient balance" : "Buy now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── My purchases ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🧾</span>
          My Proxies
        </h2>
      </div>

      {!loaded ? (
        <TableSkeleton rows={3} cols={6} />
      ) : purchases.length === 0 ? (
        <EmptyState icon="🗝️" title="No proxies yet" description="Your purchased proxy credentials will be kept here — copy them any time." />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr>
                <th className="th">Proxy</th>
                <th className="th">Country</th>
                <th className="th">Traffic</th>
                <th className="th">Credentials</th>
                <th className="th">Price</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="tr-hover">
                  <td className="td font-mono text-white font-semibold">
                    {p.host}:{p.port}
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{p.country ? getCountryFlag(p.country) : "🌐"}</span>
                      {p.country || "-"}
                    </span>
                  </td>
                  <td className="td">{formatTraffic(p.trafficGb)}</td>
                  <td className="td">
                    <span className="inline-flex items-center gap-2 max-w-[320px]">
                      <span className="font-mono text-[11px] text-fg-soft truncate" title={p.credentials}>
                        {p.credentials}
                      </span>
                      <button
                        onClick={() => copy(p.credentials, `p-${p.id}`)}
                        className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                      >
                        {copiedId === `p-${p.id}` ? "Copied ✓" : "Copy"}
                      </button>
                    </span>
                  </td>
                  <td className="td font-bold text-white tabular-nums">PKR {Number(p.pricePkr).toFixed(2)}</td>
                  <td className="td text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* ── Confirm purchase modal ── */}
      {buying && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !busy && setBuying(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-canvas border border-white/10 rounded-2xl shadow-2xl p-6 animate-fade-in">
            <h3 className="font-bold text-white text-lg">Confirm purchase</h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Proxy</span>
                <span className="font-mono font-semibold text-white truncate">{buying.host}:{buying.port}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Traffic</span>
                <span className="font-semibold text-white">{formatTraffic(buying.trafficGb)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Price</span>
                <span className="font-bold text-brand tabular-nums">PKR {buying.pricePkr.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Wallet after</span>
                <span className="font-semibold text-emerald-400 tabular-nums">PKR {(balance - buying.pricePkr).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-2.5 text-[11px] font-semibold text-red-300 leading-relaxed">
              ⚠️ Non-refundable: your balance will be charged immediately and the credentials shown right away. No refunds.
            </div>
            {error && <p className="mt-3 text-xs font-bold text-red-400">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={confirmBuy} disabled={busy} className="flex-1 btn-primary btn-shine">
                {busy ? "Buying…" : "Pay & get credentials"}
              </button>
              <button onClick={() => setBuying(null)} disabled={busy} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delivered credentials modal ── */}
      {delivered && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDelivered(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-canvas border border-brand/30 rounded-2xl shadow-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-lg">✅</span>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight">Proxy delivered</h3>
                <p className="text-[11px] text-muted">Save these credentials — this sale is final.</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-canvas/70 border border-white/10 p-3.5 font-mono text-xs text-emerald-400 break-all leading-relaxed">
              {delivered.credentials}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => copy(delivered.credentials, "delivered")}
                className="flex-1 btn-primary btn-shine"
              >
                {copiedId === "delivered" ? "Copied ✓" : "Copy credentials"}
              </button>
              <button onClick={() => setDelivered(null)} className="btn-ghost">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
