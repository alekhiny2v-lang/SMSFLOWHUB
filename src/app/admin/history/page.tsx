"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatCard, StatCardSkeleton, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Activation {
  id: number;
  username: string;
  countryName: string;
  service: string;
  phoneNumber: string;
  salePrice: string;
  status: string;
  smsCode: string;
  createdAt: string;
}

export default function AdminHistory() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch<Activation[]>("/api/admin/activations")
      .then(setActivations)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const filtered = activations.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.username.toLowerCase().includes(q) ||
      a.countryName.toLowerCase().includes(q) ||
      (a.phoneNumber || "").includes(q) ||
      (a.smsCode || "").includes(q)
    );
  });

  const revenue = activations.filter((a) => a.status !== "cancelled").reduce((s, a) => s + Number(a.salePrice || 0), 0);
  const completed = activations.filter((a) => a.status === "completed").length;

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Activation History"
        description="Complete log of every number purchased across all clients."
        icon={<span>📜</span>}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        {!loaded ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total activations" value={activations.length} hint="all clients, all time" icon="📱" tone="blue" />
            <StatCard label="Codes received" value={completed} hint="completed activations" icon="✅" tone="emerald" />
            <StatCard label="Gross revenue" value={`PKR ${revenue.toFixed(2)}`} hint="cancelled orders excluded" icon="💰" tone="white" />
          </>
        )}
      </div>

      {/* ── Log ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🗂️</span>
          Full Log
          {loaded && (
            <span className="text-[11px] font-bold bg-[#1877F2]/15 text-[#8ab9f9] border border-[#1877F2]/30 rounded-full px-2 py-0.5 tabular-nums">
              {filtered.length}
            </span>
          )}
        </h2>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user, country, number…"
            className="input pl-8! w-64! py-2! text-xs"
          />
        </div>
      </div>

      {!loaded ? (
        <TableSkeleton rows={8} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📭"
          title={activations.length === 0 ? "No activations yet" : "Nothing matches that search"}
          description={activations.length === 0 ? "Purchases made by clients will be logged here." : "Try a different search term."}
        />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr>
                <th className="th">ID</th>
                <th className="th">User</th>
                <th className="th">Country</th>
                <th className="th">Phone</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
                <th className="th">Code</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="tr-hover">
                  <td className="td text-slate-500 tabular-nums">{a.id}</td>
                  <td className="td font-semibold text-white">{a.username}</td>
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{getCountryFlagByName(a.countryName)}</span>
                      <span className="font-medium">{a.countryName || "-"}</span>
                    </span>
                  </td>
                  <td className="td font-mono">{a.phoneNumber || "-"}</td>
                  <td className="td font-semibold tabular-nums">PKR {Number(a.salePrice).toFixed(2)}</td>
                  <td className="td">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="td font-mono font-bold">
                    {a.smsCode ? <span className="text-emerald-400 tracking-wider">{a.smsCode}</span> : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="td text-slate-400">{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </AdminLayout>
  );
}
